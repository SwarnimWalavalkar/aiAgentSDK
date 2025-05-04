import "dotenv/config";
import { join } from "path";
import { mkdir, writeFile } from "fs/promises";

import { openai } from "@ai-sdk/openai";
import { createFlow } from "../../../packages/core/orchestrators/flow";
import { getWebAgent } from "./agents/webAgent";
import { getResearchCoordinatorAgent } from "./agents/researchCoordinatorAgent";
import { Agent } from "../../../packages/core/lib";
import { InMemoryStore } from "../../../packages/core/lib/memory/in-memory";

const saveReport = async (report: string) => {
  const fileName = "deep_research_flow.md";
  const outputDir = join(process.cwd(), "output");
  await mkdir(outputDir, { recursive: true }).catch(() => {});

  await writeFile(join(outputDir, fileName), report);
};

const deepResearchFlowExample = async () => {
  const webAgent = getWebAgent({ engine: "exa", llm: openai("gpt-4o-mini") });
  const researchCoordinator = getResearchCoordinatorAgent({
    llm: openai("gpt-4o-mini"),
  });

  const reportWriter = Agent({
    name: "Report Writer",
    description: "A report writer agent",
    systemPrompt: `You are a report writer. Given all the learnings and questions for further research, you will write a comprehensive report.`,
    llm: openai("gpt-4o-mini"),
    memoryStore: InMemoryStore(),
  });

  // The primary research iteration flow
  const researchIterationFlow = createFlow({
    agents: [
      researchCoordinator, // Step 1: Get guidance from the coordinator
      webAgent, // Step 2: Perform a web search based on the coordinator's guidance
      researchCoordinator, // Step 3: Analyze the search results
    ],
    // Iterate until we have enough research
    repeat: {
      until: (output) => {
        return output && output.learnings && output.learnings.length >= 5;
      },
      maxIterations: 5,
    },
  });

  // Create the main research flow
  const deepResearchFlow = createFlow({
    agents: [
      researchCoordinator, // Step 1: Initial planning by the coordinator
      researchIterationFlow, // Step 2: Multiple iterations of research
      reportWriter, // Step 3: Final report generation
    ],
  });

  const prompt = `What are the latest advancements in Type-1 diabetes treatment and management technologies?`;

  console.log("Starting deep research flow...");

  try {
    const report = await deepResearchFlow.run(`
      Research task: ${prompt}
      
      I need you to coordinate a thorough research process on this topic.
      First, provide an initial research plan with focus areas and initial search queries.
      Then, we'll iteratively search for information and refine our understanding.
      
      In your final response, please provide:
      - A comprehensive summary of the topic
      - Key learnings from the research
      - Areas that need more investigation
    `);

    await saveReport(report);

    console.log(
      "Research complete! Report saved to output/deep_research_flow.md"
    );
    return report;
  } catch (error) {
    console.error("Research flow failed:", error);
    throw error;
  }
};

const main = async () => {
  await deepResearchFlowExample();
};

main();
