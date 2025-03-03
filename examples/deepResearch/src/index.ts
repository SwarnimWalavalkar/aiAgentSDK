import "dotenv/config";

import { join } from "path";
import { mkdir, writeFile } from "fs/promises";

import { InMemoryStore } from "../../../packages/core/lib/memory/in-memory";
import { Orchestra } from "../../../packages/core/orchestrators/orchestra";

import { getWebAgent } from "./agents/webAgent";
import { Agent } from "../../../packages/core/lib";
import { getResearchCoordinatorAgent } from "./agents/researchCoordinatorAgent";
import { openai } from "@ai-sdk/openai";

const logAgentSteps = async (steps: ReturnType<Agent["invoke"]>["steps"]) => {
  for await (const step of steps) {
    if (step.toolCalls.some((call) => call.toolName.includes("invoke_"))) {
      console.log("============================================");
      step.toolCalls.map((tc, idx) => {
        console.log(`Called "${tc.toolName}"...\n---`);
        console.log(
          `With Arguments:\n${JSON.stringify(tc.args, null, 2)}\n---\n`
        );
        console.log(
          //@ts-expect-error ignore
          `RESPONSE: ${JSON.stringify(step.toolResults[idx].result, null, 2)}`
        );
        console.log("============================================");
      });
    }
  }
};

const saveReport = async (report: string) => {
  const fileName = "deep_research.md";
  const outputDir = join(process.cwd(), "output");
  await mkdir(outputDir, { recursive: true }).catch(() => {});

  await writeFile(join(outputDir, fileName), report);
};

const deepResearchExample = async () => {
  const webAgent = getWebAgent({ engine: "exa", llm: openai("gpt-4o-mini") });
  const researchCoordinator = getResearchCoordinatorAgent({
    llm: openai("gpt-4o-mini"),
  });

  const orchestra = Orchestra({
    agents: [webAgent, researchCoordinator],
    conductorLLM: openai("gpt-4o-mini"),
    goal: `You are a deep research agent. You iteratively search the web and refine your search queries to find the most relevant information. And write a detailed report in the end.`,
    directive: `Consult the research_coordinator in the beginning of your research process. And then after each web search. Consider the research_coordinator's input in your web search prompt. And always include links to key references in your report.`,
    maxIterations: 5,
    memoryStore: InMemoryStore(),
  });

  const prompt = `What are the latest advancements in Type-1 diabetes treatment and management technologies?`;

  console.log("Invoking Deep Research Agent...");
  console.log("============================================");
  const { response, steps } = orchestra.invoke([prompt]);

  await logAgentSteps(steps);

  const report = await response;

  await saveReport(report);

  console.log(`Research Report saved...`);
};

const main = async () => {
  await deepResearchExample();
};

main();
