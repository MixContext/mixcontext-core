import { hashText } from './utils/hash';
export { chunkText } from './chunk';
export { hashText } from './utils/hash';

// For convenience, provide a small wrapper that hashes binary data as UTF-8 text.
export async function hashBuffer(buf: ArrayBuffer | Uint8Array | string): Promise<string> {
  let text: string;
  if (typeof buf === 'string') {
    text = buf;
  } else if (buf instanceof Uint8Array) {
    text = new TextDecoder().decode(buf);
  } else {
    text = new TextDecoder().decode(new Uint8Array(buf));
  }
  return hashText(text);
}

// Additional re-exports of types useful for browser consumers
export type { MCXChunk, MCXDocument } from './types';

// Lightweight token estimation that avoids heavy tokenizer dependencies.
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4.2);
}
