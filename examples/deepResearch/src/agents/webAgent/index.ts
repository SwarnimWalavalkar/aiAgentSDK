import { systemPrompt } from "./prompt";
import { openai } from "@ai-sdk/openai";
import { Agent } from "../../../../../packages/core/lib";
import { getTavilyWebSearchTool } from "../../tools/tavilyWebSearch";
import { getExaWebSearchTool } from "../../tools/exaWebSearch";
import { InMemoryStore } from "../../../../../packages/core/lib/memory/in-memory";
import { LanguageModel } from "ai";
import { getTavilyGetWebpageContentsTool } from "../../tools/tavilyGetWebpageContents";
import { getExaGetWebpageContentsTool } from "../../tools/exaGetWebpageContents";

type WebAgentOptions = {
  llm?: LanguageModel;
  engine: "exa" | "tavily";
};

const TOOLSET = {
  WEB_SEARCH: {
    exa: getExaWebSearchTool(),
    tavily: getTavilyWebSearchTool(),
  },
  GET_WEB_PAGE_CONTENTS: {
    exa: getExaGetWebpageContentsTool(),
    tavily: getTavilyGetWebpageContentsTool(),
  },
} as const;

export const getWebAgent = ({ engine, llm }: WebAgentOptions) =>
  Agent({
    name: "Web Agent",
    id: "web_agent",
    description: "A web agent that can search the web for information.",
    systemPrompt: systemPrompt(),
    llm: llm ?? openai("gpt-4o-mini"),
    memoryStore: InMemoryStore(),
    tools: {
      webSearch: TOOLSET.WEB_SEARCH[engine],
      getWebpageContents: TOOLSET.GET_WEB_PAGE_CONTENTS[engine],
    },
  });
