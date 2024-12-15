import { tool } from "ai";
import { z } from "zod";

const calculateBackoff = (
  retryCount: number,
  baseDelay: number = 1000
): number => {
  const exponentialDelay = Math.min(
    baseDelay * Math.pow(2, retryCount),
    30_000
  );
  const jitter = Math.random() * 1000;
  return exponentialDelay + jitter;
};

export const webSearch = tool({
  description: "A tool for performing web searches.",
  parameters: z.object({
    reasoning: z
      .string()
      .describe(
        "Explain your thought process and reasoning for calling this tool, in imperative-style present tense"
      ),
    query: z.string().describe("The search query"),
  }),
  execute: async ({ query, reasoning }) => {
    try {
      console.log("QUERY", query);
      console.log("REASONING", reasoning);

      const maxRetries = 6;
      let retryCount = 0;
      let lastError: Error | null = null;

      while (retryCount < maxRetries) {
        try {
          const response = await fetch(
            `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(
              query
            )}&count=10`,
            {
              headers: {
                "X-Subscription-Token": process.env.BRAVE_API_KEY || "",
              },
            }
          );

          if (response.status === 200) {
            const data = await response.json();
            return data.web.results;
          }

          if (response.status === 429) {
            const retryAfter = response.headers.get("Retry-After");
            const delayMs = retryAfter
              ? parseInt(retryAfter) * 1000
              : calculateBackoff(retryCount);

            console.log(
              `Rate limit hit (attempt ${
                retryCount + 1
              }/${maxRetries}) - Waiting ${delayMs / 1000}s...`
            );
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            retryCount++;
            continue;
          }

          throw new Error(`HTTP error! status: ${response.status}`);
        } catch (error) {
          lastError = error as Error;

          if (
            !error.message.includes("429") &&
            !error.message.includes("network")
          ) {
            throw error;
          }

          const delayMs = calculateBackoff(retryCount);
          console.log(
            `Error (attempt ${retryCount + 1}/${maxRetries}) - Retrying in ${
              delayMs / 1000
            }s...`
          );
          console.error(error);

          await new Promise((resolve) => setTimeout(resolve, delayMs));
          retryCount++;
        }
      }

      throw new Error(
        `Failed after ${maxRetries} attempts. Last error: ${lastError?.message}`
      );
    } catch (error) {
      console.error("Error performing web search:", error);
      throw new Error("An error occurred while performing the web search");
    }
  },
});
