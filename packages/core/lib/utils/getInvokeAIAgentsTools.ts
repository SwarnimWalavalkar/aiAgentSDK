import { type Tool, tool } from "ai";
import { z } from "zod";
import { Agent, AgentMessage } from "..";
import { constructMessagesFromContext } from "../../orchestrators/utils/messages";

export const getInvokeAIAgentsTools = (
  agents: Array<Agent>,
  context: Array<AgentMessage>
): Record<string, Tool> => {
  return agents.reduce<Record<string, Tool>>((acc, agent) => {
    const agentDescription = `Agent Name: ${agent.name}\nAgent Description: ${agent.description}`;
    acc[`invoke_${agent.id}`] = tool({
      description: agentDescription,
      parameters: z.object({
        prompt: z.string().describe("The prompt to invoke the agent with."),
      }),
      execute: async ({ prompt }) => {
        const messages = constructMessagesFromContext(context);

        const { response: responsePromise } = agent.invoke([
          ...messages,
          { role: "user", content: prompt },
        ]);

        const response = await responsePromise;

        context.push({
          role: "assistant",
          content: response,
          prompt: prompt,
          agentName: agent.name,
        });

        return response;
      },
    });

    return acc;
  }, {});
};
