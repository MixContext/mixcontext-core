// Copyright 2025 MixContext.ai
// SPDX-License-Identifier: MIT

import { MCXDocument } from '../types';
import { v4 as uuid } from 'uuid';
import { registerParser } from './registry';
import { chunkText } from '../chunk';

// Lazily-initialised shared Tesseract worker so we pay the WASM load cost only once.
import { createWorker, type Worker as TesseractWorker } from 'tesseract.js';
import { EventEmitter } from 'events';

let worker: TesseractWorker | null = null;

/**
 * Spawn the global Tesseract worker on-demand (singleton).
 */
async function initWorker(): Promise<TesseractWorker> {
  if (worker) return worker;
  worker = await createWorker('eng');
  return worker;
}

export interface ImageParseOptions {
  /** If true run OCR, otherwise skip to keep things fast/cheap. */
  ocr?: boolean;
}

export async function parseImage(
  buf: Buffer,
  opts: ImageParseOptions = {},
  events?: EventEmitter
): Promise<MCXDocument> {
  // When OCR is explicitly disabled just return an empty doc – this allows
  // callers to quickly inspect image metadata without paying the heavyweight
  // Tesseract startup cost.
  if (!opts.ocr) {
    return {
      id: uuid(),
      filename: 'unknown.jpg',
      mimetype: 'image/jpeg',
      text: '',
      meta: { ocr: false }
    };
  }

  const w = await initWorker();

  // Bridge Tesseract's progress callbacks → EventEmitter for CLI/UI consumption.
  const { data } = await (w as any).recognize(buf, {
    logger: (m: any) => {
      if (events) events?.emit('progress', m);
    }
  } as any);

  const text = data.text.trim();
  const lines = text.split(/\r?\n/).filter(Boolean).length;

  const doc: MCXDocument = {
    id: uuid(),
    filename: 'unknown.jpg',
    mimetype: 'image/jpeg',
    text,
    chunks: await chunkText(text),
    meta: {
      ocr: true,
      lines,
      confidence: data.confidence
    }
  };

  return doc;
}

// Self-register this parser for common bitmap formats.
registerParser('image/png', parseImage as any);
registerParser('image/jpeg', parseImage as any);
