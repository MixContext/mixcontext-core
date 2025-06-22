import { describe, it, expect } from 'vitest';
import { estimateTokens, TOKENS_MODEL } from '../src/tokens';
import { GPTTokens } from 'gpt-tokens';

const texts = [
  'Hello world',
  'The quick brown fox jumps over the lazy dog.',
  'A longer paragraph with multiple sentences designed to better approximate real-world usage situations, including punctuation, numbers like 123 and emojis 😊.',
  // 5 KB lorem ipsum chunk
  Array.from({ length: 512 }, () => 'lorem ipsum').join(' ')
];

describe('estimateTokens', () => {
  it('is within ±1% of reference tokenizer', () => {
    texts.forEach(text => {
      const ref = GPTTokens.contentUsedTokens(TOKENS_MODEL as any, text);
      const est = estimateTokens(text);
      const diffRatio = Math.abs(est - ref) / ref;
      expect(diffRatio).toBeLessThanOrEqual(0.01);
    });
  });
});
