import { Agent } from "../../../lib";
import zodToJsonSchema from "zod-to-json-schema";

export const getAgentsDescription = (agents: Array<Agent>) => {
  return agents
    .map((agent) => {
      return `
Agent Name: ${agent.name}
Agent ID: ${agent.id}
Agent Description: ${agent.description}
${
  agent.tools
    ? `
Agent Tools:
${Object.entries(agent.tools)
  .map(([name, tool]) => `${name}: ${tool.description}`)
  .join("\n")}
`
    : ``
}
${
  agent.responseSchema
    ? `
Agent Response Schema:
${JSON.stringify(zodToJsonSchema(agent.responseSchema), null, 2)}
`
    : ``
}
`;
    })
    .join("\n---\n");
};
