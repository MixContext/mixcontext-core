import type { EmbedOpts } from './embed';

export interface BuildOpts {
  /** When true, include an "originals" folder with raw input files in the bundle. */
  zipOriginals?: boolean;
  /** Generate vector embeddings for each chunk using the chosen provider. */
  embed?: EmbedOpts;
  /** Enable OCR during parsing of images / scanned PDFs (not yet implemented). */
  ocr?: boolean;
  /** Enable aggressive duplicate-chunk removal. */
  dedupe?: boolean;
}
