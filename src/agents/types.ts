import { CoreMessage } from "ai";

export interface Agent<T = any> {
  name: string;
  description: string;
  basePrompt: string;
  invoke: (messages: Array<CoreMessage>) => Promise<T>;
}
