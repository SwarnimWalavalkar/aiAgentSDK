import { sleep } from "./sleep";

export type RetryConfig = {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  jitter?: number;
  exponentialFactor?: number;
  shouldRetry?: (error: Error) => boolean;
};

const defaultConfig: Required<Omit<RetryConfig, "shouldRetry">> = {
  maxRetries: 6,
  baseDelay: 1000,
  maxDelay: 30000,
  jitter: 1000,
  exponentialFactor: 2,
};

const calculateBackoff = (
  retryCount: number,
  baseDelay: number,
  maxDelay: number,
  exponentialFactor: number,
  jitter: number
): number => {
  const exponentialDelay = Math.min(
    baseDelay * Math.pow(exponentialFactor, retryCount),
    maxDelay
  );
  const jitterAmount = Math.random() * jitter;
  return exponentialDelay + jitterAmount;
};

export const withRetry = async <T>(
  fn: () => Promise<T>,
  config: RetryConfig = defaultConfig
): Promise<T> => {
  const {
    maxRetries,
    baseDelay,
    maxDelay,
    exponentialFactor,
    jitter,
    shouldRetry = () => true,
  } = { ...defaultConfig, ...config };

  let retryCount = 0;
  let lastError: Error | null = null;

  while (retryCount < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (!shouldRetry(lastError)) {
        throw error;
      }

      const delayMs = calculateBackoff(
        retryCount,
        baseDelay,
        maxDelay,
        exponentialFactor,
        jitter
      );
      console.log(
        `Error (attempt ${retryCount + 1}/${maxRetries}) - Retrying in ${
          delayMs / 1000
        }s...`
      );
      console.error(error);

      await sleep(delayMs);
      retryCount++;
    }
  }

  throw new Error(
    `Failed after ${maxRetries} attempts. Last error: ${lastError?.message}`
  );
};
