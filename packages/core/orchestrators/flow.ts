import { CoreMessage } from "ai";
import { Agent, AgentMessage } from "../lib";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import {
  formatMessageContent,
  createMessage,
  stringifyIfObject,
} from "./utils/messages";

type AgentReturnType<T> = T extends Agent<infer R> ? R : never;

type LastAgentReturnType<T extends readonly Agent<any>[]> = T extends readonly [
  ...any[],
  infer Last extends Agent<any>
]
  ? AgentReturnType<Last>
  : never;

type FlowOptions<T extends readonly [Agent<any>, ...Agent<any>[]]> = {
  agents: T;
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

export const createFlow = <T extends readonly [Agent<any>, ...Agent<any>[]]>(
  options: FlowOptions<T>
) => {
  const run = async (initialInput: string): Promise<LastAgentReturnType<T>> => {
    const { agents } = options;

    try {
      let messages: AgentMessage[] = [
        {
          role: "user",
          content: initialInput,
          prompt: initialInput,
          agentName: "__user__",
        },
      ];

      let chainState: LastAgentReturnType<T> =
        initialInput as LastAgentReturnType<T>;

      for (const agent of agents) {
        const chainStateString = stringifyIfObject(chainState);

        const output = await processAgentStep(
          agent,
          chainStateString,
          messages
        );

        const outputString =
          typeof output === "string" ? output : JSON.stringify(output);

        messages.push({
          role: "assistant",
          content: outputString,
          agentName: agent.name,
          prompt: chainStateString,
        });

        chainState = output as LastAgentReturnType<T>;
      }

      return chainState;
    } catch (error) {
      console.error("Flow execution failed:", error);
      throw error;
    }
  };

  return { run };
};
