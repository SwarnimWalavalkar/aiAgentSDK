import { CoreMessage, generateObject } from "ai";
import { Agent } from "../types";
import { MODELS, registry } from "../../lib/registry";
import { readFileSync } from "fs";
import { join } from "path";

import { z } from "zod";

export const QueryReformulationSchema = z.object({
  mainQuery: z.string(),
  subQueries: z.array(z.string()),
  technicalVariations: z.array(z.string()),
  contextualQueries: z.array(z.string()),
});

export type QueryReformulationOutput = z.infer<typeof QueryReformulationSchema>;

export const queryReformulationAgent = (): Agent<QueryReformulationOutput> => {
  const model = registry.languageModel(MODELS.OPENAI.GPT_4O_MINI_STRUCTURED);
  const basePrompt = readFileSync(join(__dirname, "basePrompt.md"), "utf-8");

  return {
    name: "Query Reformulation Agent",
    description:
      "An agent specialized in breaking down and optimizing complex queries into targeted sub-queries",
    basePrompt,
    invoke: async (messages: Array<CoreMessage>) => {
      try {
        const { object } = await generateObject({
          model,
          schema: QueryReformulationSchema,
          messages: [
            {
              role: "system",
              content: basePrompt,
            },
            ...messages,
          ],
        });

        return object;
      } catch (error) {
        console.error("Error in Query Reformulation Agent:", error);
        throw error;
      }
    },
  };
};
