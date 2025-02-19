import "dotenv/config";

import { Agent } from "../../../packages/core/lib";
import { tool } from "ai";
import { z } from "zod";
import { MODELS } from "./lib/registry";
import { registry } from "./lib/registry";
import { InMemoryStore } from "../../../packages/core/lib/memory/in-memory";

const textTest = async () => {
  const addTool = tool({
    description: "Add two numbers",
    parameters: z.object({
      a: z.number(),
      b: z.number(),
    }),
    execute: async ({ a, b }) => {
      return a + b;
    },
  });

  const multiplyTool = tool({
    description: "Multiply two numbers",
    parameters: z.object({
      a: z.number(),
      b: z.number(),
    }),
    execute: async ({ a, b }) => {
      return a * b;
    },
  });

  const mathAgent = Agent<string>({
    name: "Math Agent",
    systemPrompt: "You are a helpful agent that can help with math problems.",
    llm: registry.languageModel(MODELS.OPENAI.GPT_4O_MINI),
    memoryStore: InMemoryStore(),
    tools: {
      add: addTool,
      multiply: multiplyTool,
    },
  });

  console.log("invoking agent");

  const { steps, stream } = mathAgent.invokeStream([
    "Add the numbers 10.5 and 20.5, then multiply the result by 2, and format it nicely please.",
  ]);

  for await (const step of steps) {
    console.log("Steps");
    console.log("============================================");
    console.log(JSON.stringify(step, null, 2));
    console.log("\n");
  }

  console.log("============================================");
  console.log("RESULT:\n");

  for await (const chunk of stream) {
    process.stdout.write(chunk);
  }

  console.log("============================================");
  console.log("MEMORY:\n");
  console.log(JSON.stringify(mathAgent.getMemory(), null, 2));
};

const objectTest = async () => {
  const responseSchema = z.object({
    result: z.number(),
  });

  const mathAgent = Agent<z.infer<typeof responseSchema>>({
    name: "Math Agent",
    systemPrompt: "You are a helpful agent that can help with math problems.",
    llm: registry.languageModel(MODELS.OPENAI.GPT_4O_MINI),
    memoryStore: InMemoryStore(),
    responseType: "object",
    responseSchema: responseSchema,
  });

  const { response } = mathAgent.invoke([
    "Add the numbers 10.5 and 20.5, then multiply the result by 2, and format it nicely please.",
  ]);

  // const { stream } = mathAgent.invokeStream([
  //   "Add the numbers 10.5 and 20.5, then multiply the result by 2, and format it nicely please.",
  // ]);

  // for await (const chunk of stream) {
  //   console.log(chunk);
  // }

  console.log("============================================");
  console.log("RESULT:\n");
  console.log(await response);
  console.log("============================================");
  console.log("MEMORY:\n");
  console.log(JSON.stringify(mathAgent.getMemory(), null, 2));
};

const main = async () => {
  await textTest();
  // await objectTest();
};

main();
