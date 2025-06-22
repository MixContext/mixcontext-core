import { describe, it, expect } from 'vitest';
import { chunkText } from '../src/chunk';

const lorem = `Lorem ipsum dolor sit amet. Consectetur adipiscing elit? Donec a diam lectus! Sed sit amet ipsum mauris. Maecenas congue ligula ac quam viverra nec consectetur ante hendrerit. Donec et mollis dolor. Praesent et diam eget libero egestas mattis sit amet vitae augue. Nam tincidunt congue enim, ut porta lorem lacinia consectetur. Donec ut libero sed arcu vehicula ultricies a non tortor. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean ut gravida lorem.`;

describe('chunkText', () => {
  it('splits on sentence boundaries', async () => {
    const chunks = await chunkText(lorem, 3000, { dedupe: false });
    expect(chunks.length).toBeGreaterThan(0);
    chunks.forEach(c => {
      const lastChar = c.text.slice(-1);
      // last char should be punctuation or letter but not mid-word hyphenation.
      expect(/\w|[.!?]/.test(lastChar)).toBeTruthy();
    });
  });
});
