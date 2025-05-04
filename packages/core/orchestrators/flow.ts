import { Agent, AgentMessage } from "../lib";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import {
  formatMessageContent,
  createMessage,
  stringifyIfObject,
} from "./utils/messages";

type AgentReturnType<T> = T extends Agent<infer R>
  ? R
  : T extends Flow<infer R>
  ? R
  : never;

type LastAgentReturnType<T extends readonly (Agent<any> | Flow<any>)[]> =
  T extends readonly [...any[], infer Last extends Agent<any> | Flow<any>]
    ? AgentReturnType<Last>
    : never;

type FlowOptions<
  T extends readonly [Agent<any> | Flow<any>, ...(Agent<any> | Flow<any>)[]]
> = {
  agents: T;
  repeat?: {
    times?: number;
    until?: (output: LastAgentReturnType<T>) => boolean | Promise<boolean>;
    maxIterations?: number;
  };
};

export type Flow<T> = {
  run: (initialInput: string) => Promise<T>;
};

const logAgentOutput = async (
  agent: Agent,
  output: string,
  messageChain: AgentMessage[]
): Promise<void> => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  try {
    const logDir = join(process.cwd(), "logs");
    await mkdir(logDir, { recursive: true }).catch(() => {});

    const filename = `${agent.name.replace(/\s+/g, "_")}_${timestamp}.log`;
    const logPath = join(logDir, filename);

    const messageHistory = messageChain
      .map(formatMessageContent)
      .join("\n\n---\n\n");

    const logContent = [
      `Agent: ${agent.name}`,
      `Timestamp: ${new Date().toISOString()}`,
      "---",
      `Message Chain:`,
      messageHistory,
      "---",
      `Current Output:`,
      output,
    ].join("\n\n");

    await writeFile(logPath, logContent);
    console.log(`Logged ${agent.name}'s output to ${logPath}`);
  } catch (error) {
    console.error(`Failed to log output for ${agent.name}:`, error);
  }
};

const processAgentStep = async <T extends Agent<any>>(
  agent: T,
  input: string,
  allMessages: AgentMessage[]
): Promise<AgentReturnType<T>> => {
  const message = createMessage(input, agent, allMessages);
  const { response } = agent.invoke([message.content as string]);
  const output = await response;

  const updatedMessages = [
    ...allMessages,
    message,
    { role: "assistant", content: output, agentName: agent.name },
  ] as AgentMessage[];

  const outputString =
    typeof output === "string" ? output : JSON.stringify(output);

  await logAgentOutput(agent, outputString, updatedMessages);

  return output as AgentReturnType<T>;
};

const processStep = async <T>(
  agentOrFlow: Agent<T> | Flow<T>,
  input: string,
  allMessages: AgentMessage[]
): Promise<T> => {
  if ("run" in agentOrFlow) {
    return await agentOrFlow.run(input);
  }

  return await processAgentStep(agentOrFlow, input, allMessages);
};

export const createFlow = <
  T extends readonly [Agent<any> | Flow<any>, ...(Agent<any> | Flow<any>)[]]
>(
  options: FlowOptions<T>
) => {
  const run = async (initialInput: string): Promise<LastAgentReturnType<T>> => {
    const { agents, repeat } = options;

    try {
      let result: LastAgentReturnType<T> =
        initialInput as LastAgentReturnType<T>;
      let iterationCount = 0;
      const maxIterations = repeat?.maxIterations ?? 100;

      const timesToRun = repeat?.times ?? 1;

      const executeFlow = async (
        input: string
      ): Promise<LastAgentReturnType<T>> => {
        let messages: AgentMessage[] = [
          {
            role: "user",
            content: input,
            prompt: input,
            agentName: "__user__",
          },
        ];

        let chainState: LastAgentReturnType<T> =
          input as LastAgentReturnType<T>;

        for (const agentOrFlow of agents) {
          const chainStateString = stringifyIfObject(chainState);

          const output = await processStep(
            agentOrFlow,
            chainStateString,
            messages
          );

          const outputString =
            typeof output === "string" ? output : JSON.stringify(output);

          if (!("run" in agentOrFlow)) {
            messages.push({
              role: "assistant",
              content: outputString,
              agentName: (agentOrFlow as Agent<any>).name,
              prompt: chainStateString,
            });
          }

          chainState = output as LastAgentReturnType<T>;
        }

        return chainState;
      };

      if (repeat?.until) {
        do {
          result = await executeFlow(
            iterationCount === 0 ? initialInput : stringifyIfObject(result)
          );
          iterationCount++;

          if (iterationCount >= maxIterations) {
            console.warn(
              `Flow reached maximum iterations (${maxIterations}) with 'until' condition`
            );
            break;
          }
        } while (await repeat.until(result));
      } else {
        for (let i = 0; i < timesToRun; i++) {
          result = await executeFlow(
            i === 0 ? initialInput : stringifyIfObject(result)
          );
        }
      }

      return result;
    } catch (error) {
      console.error("Flow execution failed:", error);
      throw error;
    }
  };

  return { run };
};
