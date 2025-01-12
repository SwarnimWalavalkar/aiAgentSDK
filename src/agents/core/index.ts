import {
  CoreMessage,
  CoreTool,
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

const DEFAULT_MAX_STEPS = 15;

class ResponseCompletedError extends Error {
  constructor() {
    super("Response completed");
  }
}

type AsyncIterableStream<T> = AsyncIterable<T> & ReadableStream<T>;

export interface AgentGenerateResponse<T> {
  response: Promise<T>;
  steps: T extends string ? AsyncGenerator<AgentStep, void> : never;
}

export interface AgentStreamResponse<T> {
  stream: AsyncIterableStream<T extends string ? string : DeepPartial<T>>;
  steps: T extends string
    ? AsyncGenerator<TextStreamPart<Record<string, CoreTool>>, void, unknown>
    : never;
}

export interface Agent<T = any> {
  name: string;
  systemPrompt: string;
  tools: Record<string, CoreTool> | undefined;
  invoke: (userMessages: Array<string>) => AgentGenerateResponse<T>;
  invokeStream: (userMessages: Array<string>) => AgentStreamResponse<T>;
  appendMemory: (memory: string | Array<string>) => void;
  getMemory: () => Array<CoreMessage>;
}

type BaseAgentOptions<T> = {
  name: string;
  systemPrompt: string;
  llm: LanguageModelV1;
} & TypedAgentOptions<T>;

type TypedAgentOptions<T> = TextAgentOptions<T> | ObjectAgentOptions<T>;

type TextAgentOptions<T> = {
  responseType?: "text";
  tools?: Record<string, CoreTool>;
  maxSteps?: number;
};

type ObjectAgentOptions<T> = {
  responseType: "object" | "array" | "enum";
  responseSchema: Schema<T>;
};

type AgentOptions<T> = BaseAgentOptions<T> & TypedAgentOptions<T>;

type AgentStep = Parameters<
  NonNullable<
    Parameters<typeof generateText | typeof streamText>[0]["onStepFinish"]
  >
>[0];

export function Agent<T = string>({
  name,
  systemPrompt,
  llm,
  responseType = "text",
  ...restAgentOpts
}: AgentOptions<T>): Agent<T> {
  const memory: Array<CoreMessage> = [];
  let resolveStep: ((step: AgentStep) => void) | null = null;
  let rejectStep: ((error: Error) => void) | null = null;

  const appendMemory = (memoryToAppend: string | Array<string>) => {
    if (typeof memoryToAppend === "string") {
      memory.push({ role: "user", content: memoryToAppend });
    } else {
      memory.push(
        ...memoryToAppend.map(
          (m) => ({ role: "user", content: m } as CoreUserMessage)
        )
      );
    }
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

  const invoke = (userMessages: Array<string>) => {
    const messages = userMessages.map(
      (m) => ({ role: "user", content: m } as CoreUserMessage)
    );

    memory.push(...messages);

    if (responseType === "text") {
      const { tools, maxSteps } = restAgentOpts as TextAgentOptions<T>;

      const response = generateText({
        model: llm,
        tools,
        maxSteps: maxSteps ?? DEFAULT_MAX_STEPS,
        messages: [
          { role: "system", content: systemPrompt },
          ...memory,
          ...messages,
        ],
        onStepFinish(step) {
          resolveStep?.(step);
        },
      }).then((response) => {
        rejectStep?.(new ResponseCompletedError());
        memory.push(...response.response.messages);

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
          ...memory,
          ...messages,
        ],
      }).then((response) => {
        rejectStep?.(new ResponseCompletedError());
        memory.push({
          role: "assistant",
          content: JSON.stringify(response.object),
        });

        return response.object as T;
      });

      return { response };
    }
  };

  const invokeStream = (userMessages: Array<string>) => {
    const messages = userMessages.map(
      (m) => ({ role: "user", content: m } as CoreUserMessage)
    );

    memory.push(...messages);

    if (responseType === "text") {
      const { tools, maxSteps } = restAgentOpts as TextAgentOptions<T>;

      console.log("streaming response");

      const stream = streamText({
        model: llm,
        tools,
        maxSteps: maxSteps ?? DEFAULT_MAX_STEPS,
        messages: [
          { role: "system", content: systemPrompt },
          ...memory,
          ...messages,
        ],
        onStepFinish(step) {
          resolveStep?.(step);
        },
        onFinish(event) {
          rejectStep?.(new ResponseCompletedError());
          memory.push(...event.response.messages);
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
        ) as AsyncIterable<TextStreamPart<Record<string, CoreTool>>>,
      };
    } else {
      const { responseSchema } = restAgentOpts as ObjectAgentOptions<T>;

      const stream = streamObject({
        model: llm,
        schema: responseSchema,
        messages: [
          { role: "system", content: systemPrompt },
          ...memory,
          ...messages,
        ],
        onFinish(event) {
          rejectStep?.(new ResponseCompletedError());
          memory.push({
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
    systemPrompt,
    tools: (restAgentOpts as TextAgentOptions<T>).tools ?? undefined,
    appendMemory,
    invoke: invoke as Agent<T>["invoke"],
    invokeStream: invokeStream as Agent<T>["invokeStream"],
    getMemory: () => memory,
  };
}
