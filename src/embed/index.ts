import { MCXChunk } from '../types';

// Provider implementations (added in ./providers/*)
import { embed as openaiEmbed } from './providers/openai';
import { embed as localEmbed } from './providers/local';

/**
 * Maximum number of texts that will be sent to the embedding provider in a single request.
 */
const BATCH_SIZE = 100;

/**
 * Maximum number of parallel embedding requests that may be in‐flight at any time.
 */
const MAX_CONCURRENCY = 4;

/**
 * Maximum number of retries when a request fails with a retry‐able status code.
 */
const MAX_RETRIES = 3;

/**
 * Base delay (in milliseconds) that will be multiplied exponentially between retries.
 */
const BASE_DELAY_MS = 250;

/**
 * Allowed OpenAI embedding model identifiers.
 */
export type OpenAIModels = 'text-embedding-3-small' | 'text-embedding-3-large';

export interface EmbedOpts {
  /** Service that will be contacted to create embeddings. */
  provider: 'openai' | 'local';
  /**
   * Name of the embedding model. If omitted a sensible default will be chosen
   * based on the selected provider.
   */
  model?: OpenAIModels | string;
  /** API key for OpenAI requests. Required when provider === 'openai'. */
  apiKey?: string;
  /** Base URL of the local embedding service. Required when provider === 'local'. */
  endpoint?: string;
}

/** Utility that pauses execution for the specified number of milliseconds. */
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Executes `fn` with retry logic for responses that indicate the request
 * should be attempted again. Only 429 (rate limit) and 5xx statuses will be
 * retried.
 */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      // Attempt to extract status code from error message of the form "(...):"
      let status = 0;
      if (err instanceof Error) {
        const match = err.message.match(/\((\d{3})\)/);
        if (match) status = Number(match[1]);
      }

      const isRetryable = status === 429 || (status >= 500 && status < 600);
      if (!isRetryable || attempt === MAX_RETRIES) {
        throw err;
      }

      const delay = BASE_DELAY_MS * Math.pow(2, attempt); // exponential backoff
      /* istanbul ignore next */
      await sleep(delay);
    }
  }

  // This point should be unreachable but satisfies TypeScript return expectations
  /* istanbul ignore next */
  throw new Error('withRetry: exhausted retries without throwing');
}

/**
 * Obtain embeddings for the provided chunks using the configured provider.
 * This mutates the returned array by attaching an `embedding` property to
 * each chunk.
 */
export async function embedChunks(
  chunks: MCXChunk[],
  opts: EmbedOpts
): Promise<MCXChunk[]> {
  if (!opts) throw new Error('embedChunks: `opts` must be provided');

  const texts = chunks.map(c => c.text);

  // Pre‐allocate array that will be filled with embedding vectors in order.
  const combinedVectors: number[][] = Array(texts.length);

  // Split texts into fixed‐size batches while tracking their start index.
  const tasks: { slice: string[]; startIdx: number }[] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    tasks.push({ slice: texts.slice(i, i + BATCH_SIZE), startIdx: i });
  }

  // Worker routine that processes tasks sequentially but multiple workers run concurrently.
  let taskCursor = 0;
  async function worker() {
    while (true) {
      const myIndex = taskCursor++;
      if (myIndex >= tasks.length) break;

      const { slice, startIdx } = tasks[myIndex];

      const vectors = await withRetry(() => {
        switch (opts.provider) {
          case 'openai': {
            if (!opts.apiKey) {
              throw new Error('OpenAI embedding requires `apiKey`');
            }
            const model = opts.model ?? 'text-embedding-3-small';
            return openaiEmbed(slice, { model, apiKey: opts.apiKey });
          }
          case 'local': {
            if (!opts.endpoint) {
              throw new Error('Local embedding requires `endpoint`');
            }
            const model = opts.model ?? 'text-embedding-3-small';
            return localEmbed(slice, { model, endpoint: opts.endpoint });
          }
          /* istanbul ignore next */
          default: {
            const neverCheck: never = opts.provider;
            throw new Error(`Unsupported embedding provider: ${neverCheck}`);
          }
        }
      });

      // Insert vectors into the pre‐allocated result array.
      for (let i = 0; i < vectors.length; i++) {
        combinedVectors[startIdx + i] = vectors[i];
      }
    }
  }

  // Spin up workers respecting MAX_CONCURRENCY.
  const workerCount = Math.min(MAX_CONCURRENCY, tasks.length || 1);
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);

  return chunks.map((c, i) => ({
    ...c,
    embedding: combinedVectors[i]
  }));
}
