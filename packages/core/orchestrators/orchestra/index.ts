import { LanguageModel } from "ai";
import { Agent, AgentMessage } from "../../lib";
import { BaseMemoryStore } from "../../lib/memory";
import getConductorPrompt from "./prompts/conductor";
import { getAgentsDescription } from "./utils/getAgentsDescription";
import { getInvokeAIAgentsTools } from "../../lib/utils/getInvokeAIAgentsTools";

const DEFAULT_MAX_ITERATIONS = 4;
const DEFAULT_MAX_STEPS = 10;

export type OrchestraOptions = {
  agents: Array<Agent>;
  conductorLLM: LanguageModel;
  maxIterations?: number;
  goal: string;
  directive?: string;
  memoryStore: BaseMemoryStore;
};

export const Orchestra = ({
  conductorLLM,
  agents,
  goal,
  directive,
  memoryStore,
  maxIterations,
}: OrchestraOptions) => {
  const context: Array<AgentMessage> = [];

  const agentsDescription = getAgentsDescription(agents);

  const conductor = Agent({
    name: "Conductor",
    systemPrompt: getConductorPrompt({
      agentsDescription,
      goal,
      directive,
      maxIterations: maxIterations ?? DEFAULT_MAX_ITERATIONS,
    }),
    description: "Conductor of the orchestra.",
    llm: conductorLLM,
    responseType: "text",
    maxSteps: DEFAULT_MAX_STEPS,
    tools: getInvokeAIAgentsTools(agents, context),
    memoryStore,
  });

  return conductor;
};
