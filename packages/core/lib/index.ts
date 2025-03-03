import {
  CoreMessage,
  Tool,
  CoreUserMessage,
  DeepPartial,
  generateObject,
  generateText,
  LanguageModelV1,
  streamObject,
  streamText,
  TextStreamPart,
} from "ai";
import { Schema } from "zod";
import { BaseMemoryStore, Memory } from "./memory";
import { sanitizeAgentName } from "./utils/sanitizeAgentName";

const DEFAULT_MAX_STEPS = 15;

class ResponseCompletedError extends Error {
  constructor() {
    super("Response completed");
  }
}

type StringOrMessage = string | CoreMessage;

export type AgentMessage = CoreMessage & {
  prompt: string;
  agentName: string;
};

type AsyncIterableStream<T> = AsyncIterable<T> & ReadableStream<T>;

export interface AgentGenerateResponse<T> {
  response: Promise<T>;
  steps: T extends string ? AsyncGenerator<AgentStep, void> : never;
}

export interface AgentStreamResponse<T> {
  stream: AsyncIterableStream<T extends string ? string : DeepPartial<T>>;
  steps: T extends string
    ? AsyncGenerator<TextStreamPart<Record<string, Tool>>, void, unknown>
    : never;
}

export interface Agent<T = any> {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  tools?: Record<string, Tool>;
  responseSchema?: Schema<T>;
  appendTools: (tools: Record<string, Tool>) => void;
  invoke: (input: Array<StringOrMessage>) => AgentGenerateResponse<T>;
  invokeStream: (input: Array<StringOrMessage>) => AgentStreamResponse<T>;
  appendMemory: (memory: StringOrMessage | Array<StringOrMessage>) => void;
  getMemory: () => Array<CoreMessage>;
}

type BaseAgentOptions<T> = {
  id?: string;
  name: string;
  description: string;
  systemPrompt: string;
  llm: LanguageModelV1;
  memoryStore: BaseMemoryStore;
} & TypedAgentOptions<T>;

type TextAgentOptions<T> = {
  responseType?: "text";
  tools?: Record<string, Tool>;
  maxSteps?: number;
};

type ObjectAgentOptions<T> = {
  responseType: "object" | "array" | "enum";
  responseSchema: Schema<T>;
};

type TypedAgentOptions<T> = TextAgentOptions<T> | ObjectAgentOptions<T>;

type AgentOptions<T> = BaseAgentOptions<T> & TypedAgentOptions<T>;

type AgentStep = Parameters<
  NonNullable<
    Parameters<typeof generateText | typeof streamText>[0]["onStepFinish"]
  >
>[0];

export function Agent<T = string>({
  id,
  name,
  description,
  systemPrompt,
  llm,
  memoryStore,
  responseType = "text",
  ...restAgentOpts
}: AgentOptions<T>): Agent<T> {
  let resolveStep: ((step: AgentStep) => void) | null = null;
  let rejectStep: ((error: Error) => void) | null = null;

  let tools = (restAgentOpts as TextAgentOptions<T>).tools;

  const appendTools = (toolsToAppend: Record<string, Tool>) => {
    tools = {
      ...tools,
      ...toolsToAppend,
    };
  };

  async function* createStepGenerator(): AsyncGenerator<AgentStep, void> {
    try {
      while (true) {
        const step = await new Promise<AgentStep>((resolve, reject) => {
          resolveStep = resolve;
          rejectStep = reject;
        });

        yield step;
      }
    } catch (error) {
      if (error instanceof ResponseCompletedError) {
        return;
      }
      rejectStep?.(error as Error);
    } finally {
      resolveStep = null;
      rejectStep = null;
    }
  }

  const invoke = (input: Array<StringOrMessage>) => {
    const messages = Array.isArray(input)
      ? input.map(transformMessage)
      : [transformMessage(input)];

    memoryStore.appendMemory(messages);

    if (responseType === "text") {
      const { maxSteps } = restAgentOpts as TextAgentOptions<T>;

      const response = generateText({
        model: llm,
        tools,
        maxSteps: maxSteps ?? DEFAULT_MAX_STEPS,
        messages: [
          { role: "system", content: systemPrompt },
          ...memoryStore.getMemory(),
        ],
        onStepFinish(step) {
          resolveStep?.(step);
        },
      }).then((response) => {
        rejectStep?.(new ResponseCompletedError());
        memoryStore.appendMemory(response.response.messages);

        return response.text as T;
      });

      return { response, steps: createStepGenerator() };
    } else {
      const { responseSchema } = restAgentOpts as ObjectAgentOptions<T>;

      const response = generateObject({
        model: llm,
        schema: responseSchema,
        messages: [
          { role: "system", content: systemPrompt },
          ...memoryStore.getMemory(),
        ],
      }).then((response) => {
        rejectStep?.(new ResponseCompletedError());
        memoryStore.appendMemory({
          role: "assistant",
          content: JSON.stringify(response.object),
        });

        return response.object as T;
      });

      return { response };
    }
  };

  const invokeStream = (input: Array<StringOrMessage>) => {
    const messages = Array.isArray(input)
      ? input.map(transformMessage)
      : [transformMessage(input)];

    memoryStore.appendMemory(messages);

    if (responseType === "text") {
      const { tools, maxSteps } = restAgentOpts as TextAgentOptions<T>;

      console.log("streaming response");

      const stream = streamText({
        model: llm,
        tools,
        maxSteps: maxSteps ?? DEFAULT_MAX_STEPS,
        messages: [
          { role: "system", content: systemPrompt },
          ...memoryStore.getMemory(),
        ],
        onStepFinish(step) {
          resolveStep?.(step);
        },
        onFinish(event) {
          rejectStep?.(new ResponseCompletedError());
          memoryStore.appendMemory(event.response.messages);
        },
      });

      const [stream1, stream2] = stream.fullStream.tee();

      return {
        stream: stream1.pipeThrough(
          new TransformStream({
            transform(chunk, controller) {
              if (chunk.type === "text-delta") {
                controller.enqueue(chunk.textDelta.toString() as T);
              }
            },
          })
        ) as AsyncIterableStream<T>,
        steps: stream2.pipeThrough(
          new TransformStream({
            transform(chunk, controller) {
              if (chunk.type === "tool-call") {
                controller.enqueue(chunk);
              }
            },
          })
        ) as AsyncIterable<TextStreamPart<Record<string, Tool>>>,
      };
    } else {
      const { responseSchema } = restAgentOpts as ObjectAgentOptions<T>;

      const stream = streamObject({
        model: llm,
        schema: responseSchema,
        messages: [
          { role: "system", content: systemPrompt },
          ...memoryStore.getMemory(),
        ],
        onFinish(event) {
          rejectStep?.(new ResponseCompletedError());
          memoryStore.appendMemory({
            role: "assistant",
            content: JSON.stringify(event.object),
          });
        },
      });

      return {
        stream: stream.partialObjectStream as AsyncIterableStream<T>,
      };
    }
  };

  return {
    name,
    description,
    systemPrompt,
    appendTools,
    tools,
    id: id ?? sanitizeAgentName(name),
    responseSchema: (restAgentOpts as ObjectAgentOptions<T>).responseSchema,
    appendMemory: memoryStore.appendMemory,
    invoke: invoke as Agent<T>["invoke"],
    invokeStream: invokeStream as Agent<T>["invokeStream"],
    getMemory: memoryStore.getMemory,
  };
}

/**
 * Helper that transforms a memory item into a CoreMessage.
 *
 * - If the item is a string, we convert it into a CoreUserMessage.
 * - If it's already a CoreMessage, we return it as-is.
 */
export const transformMessage = (m: StringOrMessage): CoreMessage =>
  typeof m === "string" ? { role: "user", content: m } : m;
