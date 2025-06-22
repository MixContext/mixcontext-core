import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { embedChunks, EmbedOpts } from '../src/embed';
import { MCXChunk } from '../src/types';

const mockVector = Array.from({ length: 3 }, (_, i) => (i + 1) / 10); // [0.1,0.2,0.3]

function mockFetchReturningVector() {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      data: [{ embedding: mockVector }]
    })
  });
}

describe('embedChunks', () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    // Cast required because globalThis.fetch is read-only in DOM lib definition

    // @ts-ignore
    globalThis.fetch = mockFetchReturningVector() as any;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('embeds via OpenAI provider', async () => {
    const chunks: MCXChunk[] = [{ idx: 0, text: 'hello world' }];
    const opts: EmbedOpts = { provider: 'openai', apiKey: 'dummy', model: 'text-embedding-3-small' };
    const embedded = await embedChunks(chunks, opts);
    expect(embedded[0].embedding).toEqual(mockVector);
    expect(embedded[0].embedding?.some(Number.isNaN)).toBe(false);
  });

  it('embeds via Local provider', async () => {
    const chunks: MCXChunk[] = [{ idx: 0, text: 'hello again' }];
    const opts: EmbedOpts = { provider: 'local', endpoint: 'http://localhost:9999', model: 'text-embedding-3-small' };
    const embedded = await embedChunks(chunks, opts);
    expect(embedded[0].embedding).toEqual(mockVector);
    expect(embedded[0].embedding?.some(Number.isNaN)).toBe(false);
  });

  it('retries on 5xx then succeeds', async () => {
    const failingFetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'server error' })
      .mockResolvedValue({ ok: true, json: async () => ({ data: [{ embedding: mockVector }] }) });

    const original = globalThis.fetch;

    // @ts-ignore
    globalThis.fetch = failingFetch;

    const chunks: MCXChunk[] = [{ idx: 0, text: 'needs retry' }];
    const opts: EmbedOpts = { provider: 'openai', apiKey: 'dummy' };

    const embedded = await embedChunks(chunks, opts);
    expect(embedded[0].embedding).toEqual(mockVector);
    expect(failingFetch).toHaveBeenCalledTimes(2);

    globalThis.fetch = original;
  });
});
