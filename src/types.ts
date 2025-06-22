// Copyright 2025 MixContext.ai
// SPDX-License-Identifier: MIT

export interface MCXChunk {
  idx: number;
  text: string;
  embedding?: number[];
  /** Index of the original chunk this one duplicates (if deduplication ran) */
  dupOf?: number;
}

export interface MCXDocument {
  id: string;
  filename: string;
  mimetype: string;
  text: string;
  chunks?: MCXChunk[];
  meta?: Record<string, any>;
}

// Parsers now support both in-memory buffers (for small files) **and** a string
// path to a temporary file on disk when the file is too large to keep in RAM.
// We deliberately avoid typing `Readable` here to keep public surface minimal;
// internals can always create a stream from the path if needed.
export type ParserInput = Buffer | string; // string = absolute/relative file path

export type ParserFn = (input: ParserInput, opts?: any) => Promise<MCXDocument>;
