import { CoreMessage } from "ai";

export type Memory = string | CoreMessage;

export interface BaseMemoryStore {
  memory: Array<CoreMessage>;
  appendMemory: (memoryToAppend: Memory | Array<Memory>) => void;
  getMemory: () => Array<CoreMessage>;
}
