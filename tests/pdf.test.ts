import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
// pdf.js requires a global DOMException on Node <= 16; provide a minimal stub
// before importing the parser.
if (typeof (globalThis as any).DOMException === 'undefined') {
  (globalThis as any).DOMException = class DOMException extends Error {};
}
if (typeof (globalThis as any).DOMMatrix === 'undefined') {
  (globalThis as any).DOMMatrix = class DOMMatrix {
    constructor() {}
  };
}
if (typeof (globalThis as any).Path2D === 'undefined') {
  (globalThis as any).Path2D = class Path2D {
    constructor() {}
  };
}
if (typeof (globalThis as any).ImageData === 'undefined') {
  (globalThis as any).ImageData = class ImageData {
    constructor() {}
  };
}
if (typeof (globalThis as any).structuredClone === 'undefined') {
  (globalThis as any).structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj));
}

import PDFDocument from 'pdfkit';

// Ensure we have a reasonable sample PDF (>100 chars) in fixtures.
async function ensureFixture(): Promise<Buffer> {
  const fixturesDir = path.join(__dirname, 'fixtures');
  const pdfPath = path.join(fixturesDir, 'sample.pdf');
  await fs.mkdir(fixturesDir, { recursive: true });

  return new Promise<Buffer>(resolve => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', async () => {
      const buf = Buffer.concat(chunks);
      await fs.writeFile(pdfPath, buf);
      resolve(buf);
    });
    doc.text('MixContext PDF parser test. '.repeat(10));
    doc.end();
  });
}

describe('PDF parser', () => {
  it('extracts pages, text and chunks', async () => {
    const pdfBuffer = await ensureFixture();

    const { parsePdf } = await import('../src/parsers/pdf');
    const doc = await parsePdf(pdfBuffer);

    expect(doc.meta?.pages).toBeGreaterThan(0);
    expect(doc.text.length).toBeGreaterThan(100);
    expect(doc.chunks?.length).toBeGreaterThan(0);
  });
});
