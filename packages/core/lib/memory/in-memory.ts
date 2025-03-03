import { CoreMessage } from "ai";
import { BaseMemoryStore, Memory } from ".";
import { transformMessage } from "..";

export const InMemoryStore = (): BaseMemoryStore => {
  const memory: Array<CoreMessage> = [];

  const appendMemory = (memoryToAppend: Memory | Array<Memory>): void => {
    if (Array.isArray(memoryToAppend)) {
      memory.push(...memoryToAppend.map(transformMessage));
    } else {
      memory.push(transformMessage(memoryToAppend));
    }
  };

  return {
    memory,
    appendMemory,
    getMemory: () => memory,
  };
};
