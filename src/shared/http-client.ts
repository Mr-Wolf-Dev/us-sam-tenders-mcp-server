import { gotScraping } from 'got-scraping';

const DEFAULT_RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

export interface FetchJsonOptions {
  method?: 'GET' | 'POST';
  json?: Record<string, unknown>;
  headers?: Record<string, string>;
  maxRetries?: number;
  retryDelayMs?: number;
}

async function sleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches a JSON endpoint via HTTP-only got-scraping with linear-backoff retries on 429/5xx and network errors.
 */
export async function fetchJsonWithRetry<T = unknown>(
  url: string,
  options: FetchJsonOptions = {},
): Promise<T> {
  const method = options.method ?? 'GET';
  const maxRetries = options.maxRetries ?? 3;
  const retryDelayMs = options.retryDelayMs ?? 500;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await gotScraping({
        url,
        method,
        ...(options.json !== undefined ? { json: options.json } : {}),
        headers: {
          Accept: 'application/json',
          ...options.headers,
        },
        http2: false,
        retry: { limit: 0 },
        throwHttpErrors: false,
      });

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return JSON.parse(response.body) as T;
      }

      const error = new Error(`HTTP ${response.statusCode} from ${url}`);
      if (!DEFAULT_RETRYABLE_STATUS_CODES.has(response.statusCode) || attempt === maxRetries) {
        throw error;
      }
      lastError = error;
    } catch (err) {
      lastError = err;
      if (
        attempt === maxRetries ||
        (err instanceof Error &&
          err.message.startsWith('HTTP ') &&
          !DEFAULT_RETRYABLE_STATUS_CODES.has(Number(err.message.slice(5, 8))))
      ) {
        throw err;
      }
    }

    await sleep(retryDelayMs * attempt);
  }

  throw lastError instanceof Error ? lastError : new Error(`HTTP request failed for ${url}`);
}
