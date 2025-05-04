import "dotenv/config";

import { CoreMessage, streamText } from "ai";
import * as readline from "node:readline/promises";
import { registry, MODELS } from "../lib/registry";

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const messages: CoreMessage[] = [];

async function main() {
  while (true) {
    const userInput = await terminal.question("You: ");

    messages.push({ role: "user", content: userInput });

    const result = await streamText({
      model: registry.languageModel(MODELS.OPENAI.GPT_4O_MINI),
      system: `You are a helpful assistant.`,
      messages,
    });

    let fullResponse = "";
    terminal.write("\nAssistant: ");
    for await (const delta of result.textStream) {
      fullResponse += delta;
      terminal.write(delta);
    }
    terminal.write("\n\n");

    messages.push({ role: "assistant", content: fullResponse });
  }
}

main().catch(console.error);
