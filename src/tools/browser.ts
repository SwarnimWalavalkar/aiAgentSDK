import puppeteer from "puppeteer-core";
import { tool } from "ai";
import { z } from "zod";

const browserScrape = async ({ url }) => {
  const browser = await puppeteer.connect({
    browserWSEndpoint: `ws://${process.env.CHROMIUM_HOST}:${process.env.CHROMIUM_PORT}?token=${process.env.CHROMIUM_TOKEN}`,
  });
  const page = await browser.newPage();
  await page.goto(url);

  await page.evaluate(() => {
    const unwantedTags = [
      "script",
      "style",
      "img",
      "video",
      "audio",
      "source",
      "track",
      "iframe",
      "object",
      "embed",
      "picture",
    ];
    unwantedTags.forEach((tag) => {
      const elements = document.getElementsByTagName(tag);

      for (const element of elements) {
        if (element && element.parentNode)
          element.parentNode.removeChild(element);
      }
    });
  });

  const extractedText = await page.$eval("*", (el) => el.textContent);

  await page.close();
  await browser.close();

  return extractedText;
};

export const getWebpageContent = tool({
  description:
    "Load a webpage in a browser and return its text content — use this tool to get more context about a webpage",
  parameters: z.object({
    reasoning: z
      .string()
      .describe(
        "Explain your thought process and reasoning for calling this tool, in imperative-style present tense"
      ),
    url: z.string().describe("The URL to load"),
  }),
  execute: async ({ url }) => {
    const jinaAIContent = await fetch(`https://r.jina.ai/${url}`).then((res) =>
      res.text()
    );

    return jinaAIContent;
  },
});
