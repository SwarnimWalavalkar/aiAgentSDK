import { z } from "zod";
import { systemPrompt } from "./prompt";
import { Agent } from "../../../../../packages/core/lib";
import { InMemoryStore } from "../../../../../packages/core/lib/memory/in-memory";
import { LanguageModel } from "ai";
import { openai } from "@ai-sdk/openai";

type ResearchCoordinatorAgentOptions = {
  llm?: LanguageModel;
};

const schema = z.object({
  researchGoal: z.string(),
  learnings: z.array(z.string()),
  followUpQuestions: z.array(z.string()),
});

export const getResearchCoordinatorAgent = ({
  llm,
}: ResearchCoordinatorAgentOptions) =>
  Agent({
    name: "Research Coordinator Agent",
    id: `research_coordinator_agent`,
    description:
      "A research coordinator agent that coordinates the research process — This will set the research goal, synthesize learnings from the web search and generate follow up questions.",
    systemPrompt: systemPrompt(),
    responseType: "object",
    responseSchema: schema,
    llm: llm ?? openai("gpt-4o-mini"),
    memoryStore: InMemoryStore(),
  });
