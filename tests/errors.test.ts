import { describe, it, expect } from 'vitest';
import { parseFile } from '../src/parsers';
import { UnsupportedMimeError } from '../src/errors';

describe('error handling', () => {
  it('throws UnsupportedMimeError for unsupported mime', async () => {
    // minimal zip header
    const zipBuf = Buffer.from('504B0304', 'hex');
    await expect(parseFile(zipBuf)).rejects.toBeInstanceOf(UnsupportedMimeError);
  });

  it('throws UnsupportedMimeError when large unknown buffer cannot be parsed', async () => {
    const large = Buffer.alloc(25 * 1024 * 1024); // 25 MB of zeros
    await expect(parseFile(large)).rejects.toBeInstanceOf(UnsupportedMimeError);
  });
});
