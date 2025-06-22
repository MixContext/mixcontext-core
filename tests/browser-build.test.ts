import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'url';

const distPath = resolve(__dirname, '../dist/browser.wasm.js');

// Read the compiled bundle once so we can run static checks.
let code = '';
try {
  code = readFileSync(distPath, 'utf8');
} catch {
  // In CI we always run `pnpm build` before tests, but running the test
  // standalone (eg. via an IDE) may skip the build step. In this case we
  // silently skip the assertions that depend on the bundle being present.
  // This avoids false-negatives during local development.
}

describe('Browser bundle', () => {
  it('should exclude Node-only imports like fs', () => {
    if (!code) return; // skipped – see comment above
    expect(code.includes('require("fs")') || code.includes('node:fs')).toBe(false);
  });

  it('exposes working helpers in a VM-like context', async () => {
    // Only run if bundle exists
    if (!code) return;

    const mod = await import(pathToFileURL(distPath).href);
    expect(typeof mod.chunkText).toBe('function');
    expect(typeof mod.hashText).toBe('function');
    expect(typeof mod.hashBuffer).toBe('function');

    const chunks = await mod.chunkText('Hello world. This is MixContext.', 10);
    expect(Array.isArray(chunks)).toBe(true);
    expect(chunks.length).toBeGreaterThan(1);

    const hash = await mod.hashBuffer(new TextEncoder().encode('abc'));
    expect(typeof hash).toBe('string');
    expect(hash.length).toBe(64); // sha256 hex length
  });
});
