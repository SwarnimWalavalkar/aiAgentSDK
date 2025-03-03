import { CoreMessage, CoreUserMessage } from "ai";
import { Agent } from "../../lib";

import { AgentMessage } from "../../lib";

export const stringifyIfObject = (value: unknown): string => {
  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value);
  }
  return String(value);
};

export const formatMessageContent = (msg: AgentMessage): string => {
  const agentInfo = msg.agentName ? ` (${msg.agentName})` : "";
  return `${msg.role}${agentInfo}:\n${stringifyIfObject(msg.content)}`;
};

export const createMessage = (
  input: string,
  currentAgent: Agent<any>,
  previousMessages: AgentMessage[]
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

export const constructMessagesFromContext = (
  context: Array<AgentMessage>
): Array<CoreMessage> => {
  const messages = context
    .filter((message) => message.role === "assistant")
    .map((message) => ({
      role: "assistant",
      content: `Agent: ${message.agentName}\n\n---\nPrompt:\n'''\n${message.prompt}\n'''\n\n---\nResponse:\n'''\n${message.content}\n'''\n\n---`,
    })) as Array<CoreMessage>;

  return messages;
};
