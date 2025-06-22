import { describe, it, expect, vi } from 'vitest';

// Mock `tesseract.js` before importing the parser so that the module gets
// the stubbed `createWorker`.
vi.mock('tesseract.js', () => {
  const recognize = vi.fn().mockResolvedValue({
    data: {
      text: 'hello world',
      confidence: 90
    }
  });
  return {
    // createWorker returns a promise that resolves to an object with a
    // `recognize` method.
    createWorker: vi.fn().mockImplementation(async () => ({ recognize }))
  };
});

import { parseImage } from '../src/parsers/image';

const dummyBuf = Buffer.from('dummy image');

describe('image OCR flag', () => {
  it('skips OCR when opts.ocr === false', async () => {
    const doc = await parseImage(dummyBuf, { ocr: false });
    expect(doc.meta?.ocr).toBe(false);
    expect(doc.text).toBe('');
  });

  it('runs OCR when opts.ocr === true', async () => {
    const doc = await parseImage(dummyBuf, { ocr: true });
    expect(doc.meta?.ocr).toBe(true);
    expect(typeof doc.text).toBe('string');
    expect(doc.text.length).toBeGreaterThan(0);
  });
});
