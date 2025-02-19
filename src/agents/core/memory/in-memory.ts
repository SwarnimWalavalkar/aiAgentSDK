import { CoreMessage } from "ai";
import { BaseMemoryStore, Memory } from ".";

export const InMemoryStore = (): BaseMemoryStore => {
  const memory: Array<CoreMessage> = [];

  /**
   * Helper that transforms a memory item into a CoreMessage.
   *
   * - If the item is a string, we convert it into a CoreUserMessage.
   * - If it's already a CoreMessage, we return it as-is.
   */
  const transformMemory = (m: Memory): CoreMessage =>
    typeof m === "string" ? { role: "user", content: m } : m;

  const appendMemory = (memoryToAppend: Memory | Array<Memory>): void => {
    if (Array.isArray(memoryToAppend)) {
      memory.push(...memoryToAppend.map(transformMemory));
    } else {
      memory.push(transformMemory(memoryToAppend));
    }
  };

  return {
    memory,
    appendMemory,
    getMemory: () => memory,
  };
};
