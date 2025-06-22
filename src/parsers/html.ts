// Copyright 2025 MixContext.ai
// SPDX-License-Identifier: MIT

import { MCXDocument, ParserInput } from '../types';
import { v4 as uuid } from 'uuid';
import { extractFromHtml } from '@extractus/article-extractor';
import { chunkText } from '../chunk';
import { registerParser } from './registry';
import chardet from 'chardet';
import iconv from 'iconv-lite';
import { franc } from 'franc-min';
import { promises as fs } from 'node:fs';

/**
 * Parse raw HTML (or UTF-8 buffer) and return a MixContext document.
 */
export async function parseHtml(input: ParserInput): Promise<MCXDocument> {
  // Normalize input to a Buffer. When a string path is supplied, read from disk.
  const buf: Buffer =
    typeof input === 'string' ? await fs.readFile(input) : (input as Buffer);

  // Detect character set and decode accordingly. Default to UTF-8.
  let encoding = 'utf8';
  try {
    const detected = chardet.detect(buf);
    if (typeof detected === 'string' && detected) {
      encoding = detected.toLowerCase();
    }
  } catch {
    // Fallback – keep UTF-8.
  }

  let html: string;
  try {
    html = iconv.decode(buf, encoding);
  } catch {
    // If decoding fails, fall back to UTF-8.
    html = buf.toString('utf8');
  }

  // `article-extractor` can throw when markup is invalid; fall back to plain
  // text stripping if needed.
  let title = 'Untitled';
  let content = '';
  let site: string | undefined;

  try {
    const result = await extractFromHtml(html);

    if (result) {
      title = result.title ?? title;
      content = (result.content ?? '').trim();
      if (result.source) site = result.source;
    }
  } catch {
    // graceful degradation – strip HTML tags.
  }

  if (!content) {
    content = html.replace(/<[^>]+>/g, ' ');
  }

  const text = content.replace(/\s+/g, ' ').trim();

  // Detect primary language of the extracted text.
  let lang: string | undefined;
  try {
    const guess = franc(text.slice(0, 10_000), { minLength: 10 });
    if (guess && guess !== 'und') lang = guess;
  } catch {
    /* noop */
  }

  const meta: Record<string, any> = { title };
  if (site) meta.site = site;
  if (lang) meta.lang = lang;

  const doc: MCXDocument = {
    id: uuid(),
    filename: 'unknown.html',
    mimetype: 'text/html',
    text,
    chunks: await chunkText(text),
    meta
  };

  return doc;
}

registerParser('text/html', parseHtml);
registerParser('application/xhtml+xml', parseHtml);
