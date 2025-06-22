import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { parseHtml } from '../src/parsers/html';

async function getFixture(): Promise<Buffer> {
  const fixturesDir = path.join(__dirname, 'fixtures');
  const htmlPath = path.join(fixturesDir, 'hn.html');
  try {
    return await fs.readFile(htmlPath);
  } catch {
    // Minimal HN snippet.
    const html = `<!DOCTYPE html><html><head><title>Hacker News</title></head><body><article><h1>Test Article</h1><p>This is a short paragraph for testing HTML parsing. MixContext makes AI data prep easy.</p></article></body></html>`;
    await fs.mkdir(fixturesDir, { recursive: true });
    await fs.writeFile(htmlPath, html);
    return Buffer.from(html);
  }
}

describe('HTML parser', () => {
  it('extracts title and chunks', async () => {
    const htmlBuf = await getFixture();
    const doc = await parseHtml(htmlBuf);

    expect(doc.meta?.title).toBeTruthy();
    expect(doc.chunks?.length).toBeGreaterThan(0);
  });
});
