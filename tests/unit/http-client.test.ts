import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { fetchJsonWithRetry } from '../../src/shared/http-client.js';

const TEST_URL = 'https://api.example.com/items';
const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('fetchJsonWithRetry', () => {
  it('returns parsed JSON on 200 OK', async () => {
    server.use(
      http.get(TEST_URL, () => HttpResponse.json({ ok: true, items: ['a', 'b'] })),
    );

    const data = await fetchJsonWithRetry<{ ok: boolean; items: string[] }>(TEST_URL, {
      retryDelayMs: 0,
    });

    expect(data).toEqual({ ok: true, items: ['a', 'b'] });
  });

  it('retries on 429 and 503 before succeeding', async () => {
    let attempts = 0;

    server.use(
      http.get(TEST_URL, () => {
        attempts += 1;
        if (attempts === 1) {
          return new HttpResponse(null, { status: 429 });
        }
        if (attempts === 2) {
          return new HttpResponse(null, { status: 503 });
        }
        return HttpResponse.json({ recovered: true });
      }),
    );

    const data = await fetchJsonWithRetry<{ recovered: boolean }>(TEST_URL, {
      maxRetries: 3,
      retryDelayMs: 0,
    });

    expect(attempts).toBe(3);
    expect(data).toEqual({ recovered: true });
  });

  it('does not retry on 400 Bad Request', async () => {
    let attempts = 0;

    server.use(
      http.get(TEST_URL, () => {
        attempts += 1;
        return new HttpResponse(null, { status: 400 });
      }),
    );

    await expect(
      fetchJsonWithRetry(TEST_URL, { maxRetries: 3, retryDelayMs: 0 }),
    ).rejects.toThrow('HTTP 400');

    expect(attempts).toBe(1);
  });
});
