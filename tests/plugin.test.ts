import { describe, it, expect } from 'vitest';
import { parseFile } from '../src/parsers';
import { registerPlugin } from '../src/plugin';

// Dynamic import ensures the plugin example is not bundled unless explicitly used.

describe('plugin integration', () => {
  it('parses CSV files via registered plugin', async () => {
    const { default: csvPlugin } = await import('../examples/plugins/csv');
    registerPlugin(csvPlugin);

    const csvBuffer = Buffer.from('name,age\nAlice,30\nBob,25\n', 'utf8');
    const doc = await parseFile(csvBuffer);

    expect(doc.mimetype).toBe('text/csv');
    expect(doc.text).toContain('Alice');
    expect(doc.text).toContain('Bob');
  });
});
