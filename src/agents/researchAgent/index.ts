import { CoreMessage, generateText } from "ai";
import { Agent } from "../types";
import { MODELS, registry } from "../../lib/registry";
import { webSearch } from "../../tools/websearch";
import { getWebpageContent } from "../../tools/browser";
import { readFileSync } from "fs";

export const researchAgent = (): Agent<string> => {
  const model = registry.languageModel(MODELS.OPENAI.GPT_4O_MINI);
  const basePrompt = readFileSync(`${__dirname}/basePrompt.md`, "utf-8");

  return {
    name: "Research Agent",
    description:
      "An agent specialized in gathering and analyzing information from various sources",
    basePrompt,
    invoke: async <T>(messages: Array<CoreMessage>) => {
      try {
        const { text } = await generateText({
          model,
          tools: {
            webSearch,
            getWebpageContent,
          },
          maxSteps: 15,
          messages: [
            {
              role: "system",
              content: basePrompt,
            },
            ...messages,
          ],
          onStepFinish({ toolCalls }) {
            console.log("============================================");
            toolCalls.forEach((toolCall) => {
              const { reasoning, ...toolCallArgs } = toolCall.args;
              console.log(
                `Invoked the '${
                  toolCall.toolName
                }' tool with arguments ${JSON.stringify(toolCallArgs)}`
              );
              console.log(`Reasoning: ${reasoning}`);
              console.log("\n");
            });
          },
        });

        return text as T;
      } catch (error) {
        console.error("Error in Research Agent:", error);
        throw error;
      }
    },
  };
};
