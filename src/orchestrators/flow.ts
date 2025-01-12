import { CoreMessage, CoreUserMessage } from "ai";
import { Agent } from "../agents/core";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

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

type ExtendedCoreMessage = CoreMessage & {
  agentName?: string;
};

const stringifyIfObject = (value: unknown): string => {
  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value);
  }
  return String(value);
};

const formatMessageContent = (msg: ExtendedCoreMessage): string => {
  const agentInfo = msg.agentName ? ` (${msg.agentName})` : "";
  return `${msg.role}${agentInfo}:\n${stringifyIfObject(msg.content)}`;
};

const createMessage = (
  input: string,
  currentAgent: Agent<any>,
  previousMessages: ExtendedCoreMessage[]
): CoreUserMessage => {
  if (previousMessages.length === 0) {
    return { role: "user", content: input };
  }

  return {
    role: "user",
    content: [
      `Original Input:\n${input}`,
      ...previousMessages.map(formatMessageContent),
      `Current step: ${currentAgent.name}`,
    ].join("\n\n"),
  };
};

const logAgentOutput = async (
  agent: Agent,
  output: string,
  messageChain: ExtendedCoreMessage[]
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
  allMessages: ExtendedCoreMessage[]
): Promise<AgentReturnType<T>> => {
  const message = createMessage(input, agent, allMessages);
  const { response } = agent.invoke([message.content as string]);
  const output = await response;

  const updatedMessages = [
    ...allMessages,
    message,
    { role: "assistant", content: output, agentName: agent.name },
  ] as ExtendedCoreMessage[];

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
      let messages: ExtendedCoreMessage[] = [
        { role: "user", content: initialInput },
      ];

      let chainState: LastAgentReturnType<T> =
        initialInput as LastAgentReturnType<T>;

      for (const agent of agents) {
        const chainStateString =
          typeof chainState === "string"
            ? chainState
            : JSON.stringify(chainState);

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
