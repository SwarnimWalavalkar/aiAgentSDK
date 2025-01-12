import { MODELS, registry } from "../../lib/registry";
import { readFileSync } from "fs";
import { join } from "path";

import { z } from "zod";
import { Agent } from "../core";

export const QueryReformulationSchema = z.object({
  mainQuery: z.string(),
  subQueries: z.array(z.string()),
  technicalVariations: z.array(z.string()),
  contextualQueries: z.array(z.string()),
});

export type QueryReformulationOutput = z.infer<typeof QueryReformulationSchema>;

export const queryReformulationAgent = Agent<QueryReformulationOutput>({
  name: "Query Reformulation Agent",
  systemPrompt: readFileSync(join(__dirname, "basePrompt.md"), "utf-8"),
  llm: registry.languageModel(MODELS.OPENAI.GPT_4O_MINI),
  responseType: "object",
  responseSchema: QueryReformulationSchema,
});
