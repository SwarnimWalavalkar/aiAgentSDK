import { tool } from "ai";
import { z } from "zod";

export const calculate = tool({
  description: "A tool for performing basic arithmetic operations.",
  parameters: z.object({
    expression: z.string().describe("The javascript expression to evaluate"),
    reasoning: z
      .string()
      .describe(
        "Explain your thought process and reasoning for calling this tool, in imperative-style present tense"
      ),
  }),
  execute: async ({ expression }) => eval(expression),
});
