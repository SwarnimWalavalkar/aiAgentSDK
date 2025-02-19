import { tool } from "ai";
import { Agent } from "../agents/core";
import { z } from "zod";

export const getInvokeAIAgentTool = <T>(agent: Agent<T>) => {
  return tool({
    description: agent.name,
    parameters: z.object({
      message: z.string(),
    }),
    execute: async (input) => {
      return agent.invoke([
        ...agent.getMemory().map((m) => m.content.toString()),
        input.message,
      ]);
    },
  });
};
