import { tool } from "ai";
import { z } from "zod";
import { withRetry } from "../utils/retry";
import { tavily } from "@tavily/core";

const tvly = tavily({
  apiKey: process.env.TAVILY_API_KEY,
});

export const getTavilyWebSearchTool = () =>
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
                const response = await tvly.search(query, {
                  searchDepth: "basic",
                  maxResults: 5,
                });

                return response.results;
              })
            )
          )
        ).flat();

        return results;
      } catch (error) {
        console.error("Error performing web search with Tavily:", error);
        throw error;
      }
    },
  });
