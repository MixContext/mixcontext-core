import { describe, it, expect } from 'vitest';
import { chunkText, estimateTokens } from '../src';

describe('chunk & token', () => {
  it(
    'chunks and estimates',
    async () => {
      const text = 'a'.repeat(10000);
      const chunks = await chunkText(text, 3000);
      expect(chunks.length).toBeGreaterThan(2);
      expect(estimateTokens(text)).toBeGreaterThan(1000);
    },
    10_000 // extend timeout to 10s for tokenizer init
  );
});
