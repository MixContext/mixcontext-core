import { describe, it, expect } from 'vitest';
import { chunkText } from '../src/chunk';


describe('deduplication', () => {
  it('marks duplicate chunks with dupOf', async () => {
    const para = 'MixContext duplicate test paragraph.';
    // Repeat paragraph several times so chunker yields identical chunks
    const text = Array(5).fill(para).join(' ');

    const chunks = await chunkText(text, 50);

    // Expect at least one duplicate marker
    const dupChunks = chunks.filter(c => typeof c.dupOf === 'number');
    expect(dupChunks.length).toBeGreaterThan(0);
    dupChunks.forEach(c => {
      expect(typeof c.text).toBe('string');
      expect(c.text).toBe('');
      expect(typeof c.dupOf).toBe('number');
    });
  });
});
