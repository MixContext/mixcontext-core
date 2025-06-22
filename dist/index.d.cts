import { EventEmitter } from 'events';

interface MCXChunk {
    idx: number;
    text: string;
    embedding?: number[];
    /** Index of the original chunk this one duplicates (if deduplication ran) */
    dupOf?: number;
}
interface MCXDocument {
    id: string;
    filename: string;
    mimetype: string;
    text: string;
    chunks?: MCXChunk[];
    meta?: Record<string, any>;
}
type ParserInput = Buffer | string;
type ParserFn = (input: ParserInput, opts?: any) => Promise<MCXDocument>;

declare function parsePdf(input: ParserInput, _opts?: {
    ocr?: boolean;
}): Promise<MCXDocument>;

declare function parseDocx(input: ParserInput): Promise<MCXDocument>;

/**
 * Parse raw HTML (or UTF-8 buffer) and return a MixContext document.
 */
declare function parseHtml(input: ParserInput): Promise<MCXDocument>;

interface ImageParseOptions {
    /** If true run OCR, otherwise skip to keep things fast/cheap. */
    ocr?: boolean;
}
declare function parseImage(buf: Buffer, opts?: ImageParseOptions, events?: EventEmitter): Promise<MCXDocument>;

/**
 * Allowed OpenAI embedding model identifiers.
 */
type OpenAIModels = 'text-embedding-3-small' | 'text-embedding-3-large';
interface EmbedOpts {
    /** Service that will be contacted to create embeddings. */
    provider: 'openai' | 'local';
    /**
     * Name of the embedding model. If omitted a sensible default will be chosen
     * based on the selected provider.
     */
    model?: OpenAIModels | string;
    /** API key for OpenAI requests. Required when provider === 'openai'. */
    apiKey?: string;
    /** Base URL of the local embedding service. Required when provider === 'local'. */
    endpoint?: string;
}

interface BuildOpts {
    /** When true, include an "originals" folder with raw input files in the bundle. */
    zipOriginals?: boolean;
    /** Generate vector embeddings for each chunk using the chosen provider. */
    embed?: EmbedOpts;
    /** Enable OCR during parsing of images / scanned PDFs (not yet implemented). */
    ocr?: boolean;
    /** Enable aggressive duplicate-chunk removal. */
    dedupe?: boolean;
}

declare function parseFile(input: File | Buffer | string, _opts?: BuildOpts): Promise<MCXDocument>;

/**
 * Split text into ~`charLimit`-sized chunks, respecting sentence boundaries.
 * Falls back to a simple regex when `Intl.Segmenter` isn't available
 * (e.g. older Node versions).
 */
declare function chunkText(text: string, charLimit?: number, opts?: {
    dedupe?: boolean;
}): Promise<MCXChunk[]>;

declare const TOKENS_MODEL = "gpt-3.5-turbo";
/**
 * Estimate token count for a given text using gpt-tokens.
 * Falls back to an upper-bound approximation if tokenizer throws.
 */
declare function estimateTokens(text: string): number;

declare function buildBundle(docs: MCXDocument[], opts?: boolean | BuildOpts): Promise<Buffer>;

interface VecOptions {
    /** Optional path of the SQLite database file. Pass `:memory:` for in-memory DB. */
    dbPath?: string;
    /** Dimensionality (number of elements) of every embedding vector. */
    dim: number;
}
/** Lightweight vector database implementation that stores embeddings in a local
 *  SQLite database (better-sqlite3) with pgvector binary representation.
 *
 *  When the optional `sqlite-vec` extension is available it will be loaded so
 *  that cosine distance can be computed directly inside SQL. If the extension
 *  cannot be loaded (e.g. during CI where loadable extensions are disabled)
 *  the driver transparently falls back to an in-memory JavaScript distance
 *  computation.
 *
 *  Embeddings are stored in a table called `embeddings` using the following
 *  schema:
 *    id     TEXT PRIMARY KEY
 *    vector BLOB NOT NULL  -- pgvector binary format (4 + 4*dim bytes)
 *    meta   TEXT           -- arbitrary JSON user metadata
 */
declare class LocalVectorDB {
    private db;
    private readonly dim;
    private readonly jsFallback;
    constructor(opts: VecOptions);
    /** Insert or replace a vector together with user metadata. */
    upsert(id: string, vector: number[], meta?: any): void;
    /** Find the `k` vectors nearest to `query` using cosine similarity.  */
    search(query: number[], k?: number): Array<{
        id: string;
        score: number;
        meta: any;
    }>;
    /** Pure JS cosine similarity – avoids extra deps when sqlite-vec unavailable. */
    private cosineSimilarity;
}

export { LocalVectorDB, type MCXChunk, type MCXDocument, type ParserFn, type ParserInput, TOKENS_MODEL, type VecOptions, buildBundle, chunkText, estimateTokens, parseDocx, parseFile, parseHtml, parseImage, parsePdf };
