// Copyright 2025 MixContext.ai
// SPDX-License-Identifier: MIT

import { MCXDocument } from './types';
import archiver from 'archiver';
import { PassThrough } from 'stream';
import { chunkText } from './chunk';
import { estimateTokens } from './tokens';
import { embedChunks } from './embed';
import type { BuildOpts } from './config';

export async function buildBundle(
  docs: MCXDocument[],
  opts: boolean | BuildOpts = false
): Promise<Buffer> {
  const { zipOriginals, embed } =
    typeof opts === 'boolean'
      ? { zipOriginals: opts, embed: undefined }
      : { zipOriginals: opts.zipOriginals ?? false, embed: opts.embed };

  // Ensure each document has chunks generated.
  for (const doc of docs) {
    if (!doc.chunks) {
      doc.chunks = await chunkText(doc.text);
    }
    if (embed) {
      doc.chunks = await embedChunks(doc.chunks, embed);
    }
  }

  // Token statistics.
  const tokensPerDoc = docs.map(d => estimateTokens(d.text));
  const tokens = tokensPerDoc.reduce((sum, n) => sum + n, 0);

  // ---- streaming zip via archiver ----
  const archive = archiver('zip', { zlib: { level: 9 } });
  const out = new PassThrough();
  archive.pipe(out);
  const buffers: Buffer[] = [];
  out.on('data', chunk => buffers.push(chunk));

  const mixBuf = Buffer.from(
    JSON.stringify(
      {
        version: '0.1.0',
        created: new Date().toISOString(),
        tokens,
        tokensPerDoc,
        documents: docs
      },
      null,
      2
    )
  );

  // Store mixcontext.json uncompressed for deterministic size.
  archive.append(mixBuf, { name: 'mixcontext.json', store: true });

  if (zipOriginals) {
    for (const doc of docs) {
      const p = (doc as any).originalPath as string | undefined;
      if (p) {
        archive.file(p, { name: `originals/${doc.filename}` });
      } else if ((doc as any).original instanceof Buffer) {
        archive.append((doc as any).original, { name: `originals/${doc.filename}` });
      }
    }
  }

  await archive.finalize();

  return Buffer.concat(buffers);
}
