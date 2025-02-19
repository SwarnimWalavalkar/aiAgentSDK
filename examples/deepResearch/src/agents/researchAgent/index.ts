import { MODELS, registry } from "../../lib/registry";
import { webSearch } from "../../tools/websearch";

import { readFileSync } from "fs";
import { Agent } from "../core";
import { InMemoryStore } from "../core/memory/in-memory";

export const researchAgent = Agent({
  name: "Research Agent",
  systemPrompt: readFileSync(`${__dirname}/basePrompt.md`, "utf-8"),
  llm: registry.languageModel(MODELS.OPENAI.GPT_4O_MINI),
  memoryStore: InMemoryStore(),
  tools: {
    webSearch,
  },
});
