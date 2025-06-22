// Copyright 2025 MixContext.ai
// SPDX-License-Identifier: MIT

import { MCXChunk } from './types';
import { hashText } from './utils/hash';

/**
 * Split text into ~`charLimit`-sized chunks, respecting sentence boundaries.
 * Falls back to a simple regex when `Intl.Segmenter` isn't available
 * (e.g. older Node versions).
 */
export async function chunkText(
  text: string,
  charLimit = 3000,
  opts: { dedupe?: boolean } = {}
): Promise<MCXChunk[]> {
  const segments: string[] = [];

  if (typeof (Intl as any)?.Segmenter === 'function') {
    const SegClass = (Intl as any).Segmenter;
    const seg = new SegClass('en', { granularity: 'sentence' });
    for (const { segment } of seg.segment(text)) {
      segments.push(segment);
    }
  } else {
    // Simple fallback – split on punctuation followed by whitespace.
    segments.push(...text.split(/(?<=[.?!])\s+/));
  }

  const chunks: MCXChunk[] = [];
  let buffer = '';
  let _idx = 0;

  const push = () => {
    if (buffer.trim().length) {
      chunks.push({ idx: chunks.length, text: buffer.trim() });
      buffer = '';
      _idx++;
    }
  };

  for (const sentence of segments) {
    if (buffer.length + sentence.length <= charLimit) {
      buffer += (buffer ? ' ' : '') + sentence.trim();
    } else {
      push();
      // If single sentence longer than limit, hard-slice it.
      if (sentence.length > charLimit) {
        for (let i = 0; i < sentence.length; i += charLimit) {
          buffer = sentence.slice(i, i + charLimit);
          push();
        }
      } else {
        buffer = sentence.trim();
      }
    }
  }
  push();

  // Deduplicate identical chunks by SHA-256 hash if enabled.
  if (opts.dedupe !== false) {
    const seen = new Map<string, number>();
    for (const c of chunks) {
      if (!c.text) continue; // Skip empty (shouldn't happen pre-dedupe)
      const hash = await hashText(c.text);
      const firstIdx = seen.get(hash);
      if (firstIdx !== undefined) {
        // Mark as duplicate of the first occurrence – clear text to save bytes.
        (c as any).dupOf = firstIdx;
        c.text = '';
      } else {
        seen.set(hash, c.idx);
      }
    }
  }

  return chunks;
}
