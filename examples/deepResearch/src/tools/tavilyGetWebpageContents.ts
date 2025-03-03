import { tool } from "ai";
import { z } from "zod";
import { withRetry } from "../utils/retry";
import { tavily } from "@tavily/core";

const tvly = tavily({
  apiKey: process.env.TAVILY_API_KEY,
});

export const getTavilyGetWebpageContentsTool = () =>
  tool({
    description: "A tool for getting the contents of a webpage",
    parameters: z.object({
      url: z.string().describe(`The URL of the webpage to get the contents of`),
    }),
    execute: async ({ url }) => {
      try {
        const response = await withRetry(async () => {
          const response = await tvly.extract([url], { extractDepth: "basic" });

          return response.results[0].rawContent;
        });

        return response;
      } catch (error) {
        console.error("Error getting webpage contents with Tavily:", error);
        throw error;
      }
    },
  });
