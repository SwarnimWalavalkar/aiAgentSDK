import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI, openai as defaultOpenAI } from "@ai-sdk/openai";
import {
  experimental_createProviderRegistry as createProviderRegistry,
  experimental_customProvider as customProvider,
} from "ai";

export const MODELS = {
  ANTHROPIC: {
    SONNET: "anthropic:claude-3-5-sonnet-20241022",
  },
  OPENAI: {
    GPT_4O_MINI: "openai:gpt-4o-mini-2024-07-18",
    GPT_4O_MINI_STRUCTURED: "openai:gpt-4o-mini-structured",
    GPT_4O: "openai:gpt-4o-2024-08-06",
    GPT_4O_STRUCTURED: "openai:gpt-4o-structured",
  },
};

// custom provider with different model settings:
const openaiWithStructuredOutputs = customProvider({
  languageModels: {
    "gpt-4o-structured": defaultOpenAI(MODELS.OPENAI.GPT_4O.split(":")[1], {
      structuredOutputs: true,
    }),
    "gpt-4o-mini-structured": defaultOpenAI(
      MODELS.OPENAI.GPT_4O_MINI.split(":")[1],
      {
        structuredOutputs: true,
      }
    ),
  },
  fallbackProvider: defaultOpenAI,
});

export const registry = createProviderRegistry({
  anthropic: createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  }),

  openai: openaiWithStructuredOutputs,

  openrouter: createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    compatibility: "compatible",
  }),
});
