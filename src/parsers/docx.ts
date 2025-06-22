// Copyright 2025 MixContext.ai
// SPDX-License-Identifier: MIT

import { MCXDocument, ParserInput } from '../types';
import { v4 as uuid } from 'uuid';
import mammoth from 'mammoth';
import { chunkText } from '../chunk';
import fs from 'node:fs';
import unzipper from 'unzipper';
import sax from 'sax';
import { registerParser } from './registry';

export async function parseDocx(input: ParserInput): Promise<MCXDocument> {
  let text = '';
  let originalSize = 0;

  if (typeof input === 'string') {
    const stat = await fs.promises.stat(input);
    originalSize = stat.size;

    // Stream word/document.xml only
    const rs = fs.createReadStream(input);
    const zipStream = rs.pipe(unzipper.ParseOne(/word\/document.xml/));

    text = await extractTextFromDocumentXml(zipStream);
  } else {
    const buf = input as Buffer;
    originalSize = buf.length;
    const result = await mammoth.extractRawText({ buffer: buf });
    text = result.value.trim();
  }

  const doc: MCXDocument & { original?: Buffer; originalPath?: string } = {
    id: uuid(),
    filename: 'unknown.docx',
    mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    text,
    chunks: await chunkText(text),
    meta: { originalSize }
  };

  if (typeof input === 'string') {
    doc.originalPath = input;
  } else {
    doc.original = input as Buffer;
  }

  return doc;
}

async function extractTextFromDocumentXml(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const parser = sax.createStream(true, {});
    let textParts: string[] = [];
    parser.on('text', (t: string) => {
      textParts.push(t);
    });
    parser.on('error', reject);
    parser.on('end', () => {
      resolve(textParts.join(' ').replace(/\s+/g, ' ').trim());
    });
    stream.pipe(parser);
  });
}

// Register parser on import.
registerParser('application/vnd.openxmlformats-officedocument.wordprocessingml.document', parseDocx);
