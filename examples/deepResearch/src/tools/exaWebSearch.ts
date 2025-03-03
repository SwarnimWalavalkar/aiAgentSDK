import { tool } from "ai";
import Exa from "exa-js";
import { z } from "zod";
import { withRetry } from "../utils/retry";

const exa = new Exa(process.env.EXA_API_KEY);

export const getExaWebSearchTool = () =>
  tool({
    description: "A tool for performing web searches",
    parameters: z.object({
      queries: z
        .array(z.string())
        .describe(
          `Web search queries. Make sure each query is unique and not too similar to the others. Consider the results from the previous sets of queries when generating the next query.`
        ),
    }),
    execute: async ({ queries }) => {
      try {
        const results = (
          await Promise.all(
            queries.map((query) =>
              withRetry(async () => {
                const response = await exa.searchAndContents(query, {
                  numResults: 5,
                  summary: true,
                });

                return response.results;
              })
            )
          )
        ).flat();

        return results;
      } catch (error) {
        console.error("Error performing web search with Exa:", error);
        throw error;
      }
    },
  });
