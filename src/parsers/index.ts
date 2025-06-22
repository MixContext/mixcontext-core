// re-export individual parsers
export { parsePdf } from './pdf';
export { parseDocx } from './docx';
export { parseHtml } from './html';
export { parseImage } from './image';

import { MCXDocument } from '../types';
import { fileTypeFromBuffer } from 'file-type';
import { getParser } from './registry';
import { UnsupportedMimeError } from '../errors';
import type { BuildOpts } from '../config';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import * as mime from 'mime-types';

// If an input file is larger than this threshold (bytes), we avoid buffering it
// in memory and instead operate on a temporary file path.
const STREAM_THRESHOLD = 25 * 1024 * 1024; // 25 MB

export async function parseFile(
  input: File | Buffer | string,
  _opts: BuildOpts = {}
): Promise<MCXDocument> {
  // Scenario A: caller already provided a string path (used by CLI for huge files)
  if (typeof input === 'string') {
    const absPath = path.resolve(input);
    const mimeGuess = mime.lookup(absPath) || 'application/octet-stream';
    const parser = getParser(mimeGuess as string);
    if (!parser) throw new UnsupportedMimeError(`Unsupported mime: ${mimeGuess}`);
    const doc = await parser(absPath, _opts);
    (doc as any).originalPath = absPath;
    return doc;
  }

  // Scenario B: File (browser) or Buffer (Node) – decide whether to stream.

  let buf: Buffer;
  if (input instanceof Buffer) {
    buf = input;
  } else {
    // DOM File – no "size" property in TS yet, but we rely on it at runtime.
    const fileLike: any = input;
    if (fileLike.size >= STREAM_THRESHOLD) {
      // Create tmp file and stream write into it.
      const { path: tmpPath, cleanup } = await writeTmpFile(await fileLike.arrayBuffer());
      const mimeFromName = fileLike.type || mime.lookup(fileLike.name) || 'application/octet-stream';
      const parser = getParser(mimeFromName as string);
      if (!parser) throw new UnsupportedMimeError(`Unsupported mime: ${mimeFromName}`);
      const doc = await parser(tmpPath, _opts);
      (doc as any).originalPath = tmpPath;
      // Allow caller to clean up later; we attach cleanup function
      (doc as any)._cleanupTmp = cleanup;
      return doc;
    }
    buf = Buffer.from(await fileLike.arrayBuffer());
  }

  // Buffer path (size may still be > threshold if provided directly)
  if (buf.length >= STREAM_THRESHOLD) {
    const { path: tmpPath } = await writeTmpFile(buf);
    return await parseFile(tmpPath, _opts); // recurse into string path branch
  }

  let type: Awaited<ReturnType<typeof fileTypeFromBuffer>>;
  try {
    type = await fileTypeFromBuffer(buf);
  } catch {
    type = undefined;
  }

  let mimeType = type?.mime || (input instanceof File ? (input as any).type : 'application/octet-stream');
  if ((mimeType === 'application/octet-stream' || mimeType === 'text/plain') && buf.length > 0) {
    const sample = buf.slice(0, 4096).toString('utf8');
    if (sample.includes(',') && sample.includes('\n') && !sample.includes('\0')) {
      mimeType = 'text/csv';
    }
  }

  const parser = getParser(mimeType);
  if (!parser) throw new UnsupportedMimeError(`Unsupported mime: ${mimeType}`);

  const doc: MCXDocument = await parser(buf, _opts);
  (doc as any).original = buf;
  doc.meta = { ...(doc.meta || {}), originalSize: buf.length };
  return doc;
}

// Helper: write a buffer to a tmp file and return its path + cleanup function.
async function writeTmpFile(data: Buffer | ArrayBuffer): Promise<{ path: string; cleanup: () => Promise<void> }> {
  const { mkdtemp, writeFile, rm } = fs;
  const os = await import('node:os');
  const dir = await mkdtemp(path.join(os.tmpdir(), 'mixcx-'));
  const tmpPath = path.join(dir, 'input');
  await writeFile(tmpPath, data instanceof Buffer ? data : Buffer.from(data));
  return { path: tmpPath, cleanup: () => rm(dir, { recursive: true, force: true }) };
}
