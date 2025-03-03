import { tool } from "ai";
import Exa from "exa-js";
import { z } from "zod";
import { withRetry } from "../utils/retry";

const exa = new Exa(process.env.EXA_API_KEY);

export const getExaGetWebpageContentsTool = () =>
  tool({
    description: "A tool for getting the contents of a webpage",
    parameters: z.object({
      url: z.string().describe(`The URL of the webpage to get the contents of`),
    }),
    execute: async ({ url }) => {
      try {
        const response = await withRetry(
          async () => {
            const response = await exa.getContents(url);

            return response.results[0];
          },
          {
            maxRetries: 3,
            shouldRetry(error) {
              return error instanceof Response && error.status === 429;
            },
          }
        );

        return response;
      } catch (error) {
        console.error("Error getting webpage contents with Exa:", error);
        throw error;
      }
    },
  });
