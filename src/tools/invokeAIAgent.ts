import { tool } from "ai";
import { Agent } from "../agents/core";
import { z } from "zod";
import { registry } from "../lib/registry";
import { MODELS } from "../lib/registry";

export const getInvokeAIAgentTool = <T>(agent: Agent<T>) => {
  return tool({
    description: agent.name,
    parameters: z.object({
      message: z.string(),
    }),
    execute: async (input) => {
      return agent.invoke([input.message]);
    },
  });
};

const test = Agent({
  name: "test",
  systemPrompt: "You are a test agent",
  llm: registry.languageModel(MODELS.OPENAI.GPT_4O_MINI),
});

const invocation = test.invoke(["Hello, how are you?"]);
const response = await invocation.response;

console.log(response);
