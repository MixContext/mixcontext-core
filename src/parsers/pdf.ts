// Copyright 2025 MixContext.ai
// SPDX-License-Identifier: MIT

import { MCXDocument } from '../types';
import { v4 as uuid } from 'uuid';
import { chunkText } from '../chunk';
// Using legacy build for Node to avoid DOM dependencies.
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { registerParser } from './registry';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { ParserInput } from '../types';

export async function parsePdf(input: ParserInput, _opts: { ocr?: boolean } = {}): Promise<MCXDocument> {
  /* _opts.ocr is currently ignored – OCR for scanned PDFs will be added in future. */

  let pdf: any;
  let originalSize = 0;

  if (typeof input === 'string') {
    const stat = await fs.promises.stat(input);
    originalSize = stat.size;
    pdf = await (getDocument as any)({
      url: input,
      disableWorker: true,
      useSystemFonts: true
    }).promise;
  } else {
    const buf = input as Buffer;
    originalSize = buf.length;
    const uint8Data = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    pdf = await (getDocument as any)({
      data: uint8Data,
      disableWorker: true,
      useSystemFonts: true
    }).promise;
  }

  const pages: string[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    // Each item in `items` has a `str` property that contains text fragment.
    const pageText = textContent.items
      .map((i: any) => i.str as string)
      .join(' ');
    pages.push(pageText.trim());
  }

  const text = pages.join('\n\n');

  const doc: MCXDocument & { original?: Buffer; originalPath?: string } = {
    id: uuid(),
    filename: 'unknown.pdf',
    mimetype: 'application/pdf',
    text,
    chunks: await chunkText(text),
    meta: { pages: pdf.numPages, originalSize }
  };

  if (typeof input === 'string') {
    doc.originalPath = input;

    // compute sha256 hash while streaming to avoid buffering
    try {
      const hash = crypto.createHash('sha256');
      await new Promise<void>((resolve, reject) => {
        const rs = fs.createReadStream(input);
        rs.on('data', chunk => hash.update(chunk));
        rs.on('error', reject);
        rs.on('end', () => {
          doc.meta = { ...(doc.meta || {}), sha256: hash.digest('hex') };
          resolve();
        });
      });
    } catch {/* non-fatal */}
  } else {
    doc.original = input as Buffer; // keep raw binary when bundling originals
  }
  return doc;
}

// Register parser on import.
registerParser('application/pdf', parsePdf);
