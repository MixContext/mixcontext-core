"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  LocalVectorDB: () => LocalVectorDB,
  TOKENS_MODEL: () => TOKENS_MODEL,
  buildBundle: () => buildBundle,
  chunkText: () => chunkText,
  estimateTokens: () => estimateTokens,
  parseDocx: () => parseDocx,
  parseFile: () => parseFile,
  parseHtml: () => parseHtml,
  parseImage: () => parseImage,
  parsePdf: () => parsePdf
});
module.exports = __toCommonJS(src_exports);

// src/parsers/pdf.ts
var import_uuid = require("uuid");

// src/utils/hash.ts
async function hashText(text) {
  if (typeof globalThis.crypto?.subtle?.digest === "function") {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuf = await globalThis.crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuf));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  const { createHash } = await import("crypto");
  return createHash("sha256").update(text).digest("hex");
}

// src/chunk.ts
async function chunkText(text, charLimit = 3e3, opts = {}) {
  const segments = [];
  if (typeof Intl?.Segmenter === "function") {
    const SegClass = Intl.Segmenter;
    const seg = new SegClass("en", { granularity: "sentence" });
    for (const { segment } of seg.segment(text)) {
      segments.push(segment);
    }
  } else {
    segments.push(...text.split(/(?<=[.?!])\s+/));
  }
  const chunks = [];
  let buffer = "";
  let _idx = 0;
  const push = () => {
    if (buffer.trim().length) {
      chunks.push({ idx: chunks.length, text: buffer.trim() });
      buffer = "";
      _idx++;
    }
  };
  for (const sentence of segments) {
    if (buffer.length + sentence.length <= charLimit) {
      buffer += (buffer ? " " : "") + sentence.trim();
    } else {
      push();
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
  if (opts.dedupe !== false) {
    const seen = /* @__PURE__ */ new Map();
    for (const c of chunks) {
      if (!c.text) continue;
      const hash = await hashText(c.text);
      const firstIdx = seen.get(hash);
      if (firstIdx !== void 0) {
        c.dupOf = firstIdx;
        c.text = "";
      } else {
        seen.set(hash, c.idx);
      }
    }
  }
  return chunks;
}

// src/parsers/pdf.ts
var import_pdf = require("pdfjs-dist/legacy/build/pdf.mjs");

// src/plugin.ts
var plugins = [];
function getPlugin(mime2) {
  return plugins.find(
    (p) => typeof p.mime === "string" ? p.mime === mime2 : p.mime.test(mime2)
  );
}

// src/parsers/registry.ts
var registry = /* @__PURE__ */ new Map();
function registerParser(mime2, fn) {
  registry.set(mime2.toLowerCase(), fn);
}
function getParser(mime2) {
  const internal = registry.get(mime2.toLowerCase());
  if (internal) return internal;
  const plugin = getPlugin(mime2);
  return plugin?.parse;
}

// src/parsers/pdf.ts
var import_node_fs = __toESM(require("fs"), 1);
var import_node_crypto = __toESM(require("crypto"), 1);
async function parsePdf(input, _opts = {}) {
  let pdf;
  let originalSize = 0;
  if (typeof input === "string") {
    const stat = await import_node_fs.default.promises.stat(input);
    originalSize = stat.size;
    pdf = await (0, import_pdf.getDocument)({
      url: input,
      disableWorker: true,
      useSystemFonts: true
    }).promise;
  } else {
    const buf = input;
    originalSize = buf.length;
    const uint8Data = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    pdf = await (0, import_pdf.getDocument)({
      data: uint8Data,
      disableWorker: true,
      useSystemFonts: true
    }).promise;
  }
  const pages = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((i) => i.str).join(" ");
    pages.push(pageText.trim());
  }
  const text = pages.join("\n\n");
  const doc = {
    id: (0, import_uuid.v4)(),
    filename: "unknown.pdf",
    mimetype: "application/pdf",
    text,
    chunks: await chunkText(text),
    meta: { pages: pdf.numPages, originalSize }
  };
  if (typeof input === "string") {
    doc.originalPath = input;
    try {
      const hash = import_node_crypto.default.createHash("sha256");
      await new Promise((resolve, reject) => {
        const rs = import_node_fs.default.createReadStream(input);
        rs.on("data", (chunk) => hash.update(chunk));
        rs.on("error", reject);
        rs.on("end", () => {
          doc.meta = { ...doc.meta || {}, sha256: hash.digest("hex") };
          resolve();
        });
      });
    } catch {
    }
  } else {
    doc.original = input;
  }
  return doc;
}
registerParser("application/pdf", parsePdf);

// src/parsers/docx.ts
var import_uuid2 = require("uuid");
var import_mammoth = __toESM(require("mammoth"), 1);
var import_node_fs2 = __toESM(require("fs"), 1);
var import_unzipper = __toESM(require("unzipper"), 1);
var import_sax = __toESM(require("sax"), 1);
async function parseDocx(input) {
  let text = "";
  let originalSize = 0;
  if (typeof input === "string") {
    const stat = await import_node_fs2.default.promises.stat(input);
    originalSize = stat.size;
    const rs = import_node_fs2.default.createReadStream(input);
    const zipStream = rs.pipe(import_unzipper.default.ParseOne(/word\/document.xml/));
    text = await extractTextFromDocumentXml(zipStream);
  } else {
    const buf = input;
    originalSize = buf.length;
    const result = await import_mammoth.default.extractRawText({ buffer: buf });
    text = result.value.trim();
  }
  const doc = {
    id: (0, import_uuid2.v4)(),
    filename: "unknown.docx",
    mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    text,
    chunks: await chunkText(text),
    meta: { originalSize }
  };
  if (typeof input === "string") {
    doc.originalPath = input;
  } else {
    doc.original = input;
  }
  return doc;
}
async function extractTextFromDocumentXml(stream) {
  return new Promise((resolve, reject) => {
    const parser = import_sax.default.createStream(true, {});
    let textParts = [];
    parser.on("text", (t) => {
      textParts.push(t);
    });
    parser.on("error", reject);
    parser.on("end", () => {
      resolve(textParts.join(" ").replace(/\s+/g, " ").trim());
    });
    stream.pipe(parser);
  });
}
registerParser("application/vnd.openxmlformats-officedocument.wordprocessingml.document", parseDocx);

// src/parsers/html.ts
var import_uuid3 = require("uuid");
var import_article_extractor = require("@extractus/article-extractor");
var import_chardet = __toESM(require("chardet"), 1);
var import_iconv_lite = __toESM(require("iconv-lite"), 1);
var import_franc_min = require("franc-min");
var import_node_fs3 = require("fs");
async function parseHtml(input) {
  const buf = typeof input === "string" ? await import_node_fs3.promises.readFile(input) : input;
  let encoding = "utf8";
  try {
    const detected = import_chardet.default.detect(buf);
    if (typeof detected === "string" && detected) {
      encoding = detected.toLowerCase();
    }
  } catch {
  }
  let html;
  try {
    html = import_iconv_lite.default.decode(buf, encoding);
  } catch {
    html = buf.toString("utf8");
  }
  let title = "Untitled";
  let content = "";
  let site;
  try {
    const result = await (0, import_article_extractor.extractFromHtml)(html);
    if (result) {
      title = result.title ?? title;
      content = (result.content ?? "").trim();
      if (result.source) site = result.source;
    }
  } catch {
  }
  if (!content) {
    content = html.replace(/<[^>]+>/g, " ");
  }
  const text = content.replace(/\s+/g, " ").trim();
  let lang;
  try {
    const guess = (0, import_franc_min.franc)(text.slice(0, 1e4), { minLength: 10 });
    if (guess && guess !== "und") lang = guess;
  } catch {
  }
  const meta = { title };
  if (site) meta.site = site;
  if (lang) meta.lang = lang;
  const doc = {
    id: (0, import_uuid3.v4)(),
    filename: "unknown.html",
    mimetype: "text/html",
    text,
    chunks: await chunkText(text),
    meta
  };
  return doc;
}
registerParser("text/html", parseHtml);
registerParser("application/xhtml+xml", parseHtml);

// src/parsers/image.ts
var import_uuid4 = require("uuid");
var import_tesseract = require("tesseract.js");
var worker = null;
async function initWorker() {
  if (worker) return worker;
  worker = await (0, import_tesseract.createWorker)("eng");
  return worker;
}
async function parseImage(buf, opts = {}, events) {
  if (!opts.ocr) {
    return {
      id: (0, import_uuid4.v4)(),
      filename: "unknown.jpg",
      mimetype: "image/jpeg",
      text: "",
      meta: { ocr: false }
    };
  }
  const w = await initWorker();
  const { data } = await w.recognize(buf, {
    logger: (m) => {
      if (events) events?.emit("progress", m);
    }
  });
  const text = data.text.trim();
  const lines = text.split(/\r?\n/).filter(Boolean).length;
  const doc = {
    id: (0, import_uuid4.v4)(),
    filename: "unknown.jpg",
    mimetype: "image/jpeg",
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
registerParser("image/png", parseImage);
registerParser("image/jpeg", parseImage);

// src/parsers/index.ts
var import_file_type = require("file-type");

// src/errors.ts
var UnsupportedMimeError = class extends Error {
  constructor(mime2, message = "Unsupported MIME type") {
    super(message);
    this.name = "UnsupportedMimeError";
    this.mime = mime2;
  }
};

// src/parsers/index.ts
var import_node_fs4 = require("fs");
var import_node_path = __toESM(require("path"), 1);
var mime = __toESM(require("mime-types"), 1);
var STREAM_THRESHOLD = 25 * 1024 * 1024;
async function parseFile(input, _opts = {}) {
  if (typeof input === "string") {
    const absPath = import_node_path.default.resolve(input);
    const mimeGuess = mime.lookup(absPath) || "application/octet-stream";
    const parser2 = getParser(mimeGuess);
    if (!parser2) throw new UnsupportedMimeError(`Unsupported mime: ${mimeGuess}`);
    const doc2 = await parser2(absPath, _opts);
    doc2.originalPath = absPath;
    return doc2;
  }
  let buf;
  if (input instanceof Buffer) {
    buf = input;
  } else {
    const fileLike = input;
    if (fileLike.size >= STREAM_THRESHOLD) {
      const { path: tmpPath, cleanup } = await writeTmpFile(await fileLike.arrayBuffer());
      const mimeFromName = fileLike.type || mime.lookup(fileLike.name) || "application/octet-stream";
      const parser2 = getParser(mimeFromName);
      if (!parser2) throw new UnsupportedMimeError(`Unsupported mime: ${mimeFromName}`);
      const doc2 = await parser2(tmpPath, _opts);
      doc2.originalPath = tmpPath;
      doc2._cleanupTmp = cleanup;
      return doc2;
    }
    buf = Buffer.from(await fileLike.arrayBuffer());
  }
  if (buf.length >= STREAM_THRESHOLD) {
    const { path: tmpPath } = await writeTmpFile(buf);
    return await parseFile(tmpPath, _opts);
  }
  let type;
  try {
    type = await (0, import_file_type.fileTypeFromBuffer)(buf);
  } catch {
    type = void 0;
  }
  let mimeType = type?.mime || (input instanceof File ? input.type : "application/octet-stream");
  if ((mimeType === "application/octet-stream" || mimeType === "text/plain") && buf.length > 0) {
    const sample = buf.slice(0, 4096).toString("utf8");
    if (sample.includes(",") && sample.includes("\n") && !sample.includes("\0")) {
      mimeType = "text/csv";
    }
  }
  const parser = getParser(mimeType);
  if (!parser) throw new UnsupportedMimeError(`Unsupported mime: ${mimeType}`);
  const doc = await parser(buf, _opts);
  doc.original = buf;
  doc.meta = { ...doc.meta || {}, originalSize: buf.length };
  return doc;
}
async function writeTmpFile(data) {
  const { mkdtemp, writeFile, rm } = import_node_fs4.promises;
  const os = await import("os");
  const dir = await mkdtemp(import_node_path.default.join(os.tmpdir(), "mixcx-"));
  const tmpPath = import_node_path.default.join(dir, "input");
  await writeFile(tmpPath, data instanceof Buffer ? data : Buffer.from(data));
  return { path: tmpPath, cleanup: () => rm(dir, { recursive: true, force: true }) };
}

// src/tokens.ts
var import_gpt_tokens = require("gpt-tokens");
var TOKENS_MODEL = "gpt-3.5-turbo";
function estimateTokens(text) {
  try {
    return import_gpt_tokens.GPTTokens.contentUsedTokens(TOKENS_MODEL, text);
  } catch {
    return Math.ceil(text.length / 4.2);
  }
}

// src/bundle.ts
var import_archiver = __toESM(require("archiver"), 1);
var import_stream = require("stream");

// src/embed/providers/openai.ts
async function embed(inputs, opts) {
  if (process.env.MIXCONTEXT_MOCK_EMBED === "1") {
    return inputs.map(() => Array(5).fill(0));
  }
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`
    },
    body: JSON.stringify({ model: opts.model, input: inputs })
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI embeddings request failed (${res.status}): ${errText}`);
  }
  const json = await res.json();
  return json.data.map((d) => d.embedding);
}

// src/embed/providers/local.ts
async function embed2(inputs, opts) {
  if (process.env.MIXCONTEXT_MOCK_EMBED === "1") {
    return inputs.map(() => Array(5).fill(0));
  }
  const url = `${opts.endpoint.replace(/\/+$/, "")}/embeddings`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ model: opts.model, input: inputs })
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Local embeddings request failed (${res.status}): ${errText}`);
  }
  const json = await res.json();
  return json.data.map((d) => d.embedding);
}

// src/embed/index.ts
var BATCH_SIZE = 100;
var MAX_CONCURRENCY = 4;
var MAX_RETRIES = 3;
var BASE_DELAY_MS = 250;
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function withRetry(fn) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      let status = 0;
      if (err instanceof Error) {
        const match = err.message.match(/\((\d{3})\)/);
        if (match) status = Number(match[1]);
      }
      const isRetryable = status === 429 || status >= 500 && status < 600;
      if (!isRetryable || attempt === MAX_RETRIES) {
        throw err;
      }
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      await sleep(delay);
    }
  }
  throw new Error("withRetry: exhausted retries without throwing");
}
async function embedChunks(chunks, opts) {
  if (!opts) throw new Error("embedChunks: `opts` must be provided");
  const texts = chunks.map((c) => c.text);
  const combinedVectors = Array(texts.length);
  const tasks = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    tasks.push({ slice: texts.slice(i, i + BATCH_SIZE), startIdx: i });
  }
  let taskCursor = 0;
  async function worker2() {
    while (true) {
      const myIndex = taskCursor++;
      if (myIndex >= tasks.length) break;
      const { slice, startIdx } = tasks[myIndex];
      const vectors = await withRetry(() => {
        switch (opts.provider) {
          case "openai": {
            if (!opts.apiKey) {
              throw new Error("OpenAI embedding requires `apiKey`");
            }
            const model = opts.model ?? "text-embedding-3-small";
            return embed(slice, { model, apiKey: opts.apiKey });
          }
          case "local": {
            if (!opts.endpoint) {
              throw new Error("Local embedding requires `endpoint`");
            }
            const model = opts.model ?? "text-embedding-3-small";
            return embed2(slice, { model, endpoint: opts.endpoint });
          }
          /* istanbul ignore next */
          default: {
            const neverCheck = opts.provider;
            throw new Error(`Unsupported embedding provider: ${neverCheck}`);
          }
        }
      });
      for (let i = 0; i < vectors.length; i++) {
        combinedVectors[startIdx + i] = vectors[i];
      }
    }
  }
  const workerCount = Math.min(MAX_CONCURRENCY, tasks.length || 1);
  const workers = Array.from({ length: workerCount }, () => worker2());
  await Promise.all(workers);
  return chunks.map((c, i) => ({
    ...c,
    embedding: combinedVectors[i]
  }));
}

// src/bundle.ts
async function buildBundle(docs, opts = false) {
  const { zipOriginals, embed: embed3 } = typeof opts === "boolean" ? { zipOriginals: opts, embed: void 0 } : { zipOriginals: opts.zipOriginals ?? false, embed: opts.embed };
  for (const doc of docs) {
    if (!doc.chunks) {
      doc.chunks = await chunkText(doc.text);
    }
    if (embed3) {
      doc.chunks = await embedChunks(doc.chunks, embed3);
    }
  }
  const tokensPerDoc = docs.map((d) => estimateTokens(d.text));
  const tokens = tokensPerDoc.reduce((sum, n) => sum + n, 0);
  const archive = (0, import_archiver.default)("zip", { zlib: { level: 9 } });
  const out = new import_stream.PassThrough();
  archive.pipe(out);
  const buffers = [];
  out.on("data", (chunk) => buffers.push(chunk));
  const mixBuf = Buffer.from(
    JSON.stringify(
      {
        version: "0.1.0",
        created: (/* @__PURE__ */ new Date()).toISOString(),
        tokens,
        tokensPerDoc,
        documents: docs
      },
      null,
      2
    )
  );
  archive.append(mixBuf, { name: "mixcontext.json", store: true });
  if (zipOriginals) {
    for (const doc of docs) {
      const p = doc.originalPath;
      if (p) {
        archive.file(p, { name: `originals/${doc.filename}` });
      } else if (doc.original instanceof Buffer) {
        archive.append(doc.original, { name: `originals/${doc.filename}` });
      }
    }
  }
  await archive.finalize();
  return Buffer.concat(buffers);
}

// src/vector/local.ts
var import_pgvector = require("pgvector");
var sqliteVec = __toESM(require("sqlite-vec"), 1);
var BetterSqlite;
var InMemorySQLite = class {
  constructor(_filename = ":memory:") {
    this._rows = [];
  }
  /** No-op for the subset of SQL that creates tables / indexes. */
  exec(_sql) {
  }
  /** Return a 'statement' object whose behaviour depends on the SQL string. */
  prepare(sql) {
    const upper = sql.trim().toUpperCase();
    if (upper.startsWith("INSERT")) {
      return {
        run: (id, vecBuf, metaJson) => {
          const idx = this._rows.findIndex((r) => r.id === id);
          const row = { id, vector: vecBuf, meta: metaJson };
          if (idx >= 0) this._rows[idx] = row;
          else this._rows.push(row);
        }
      };
    }
    if (upper.startsWith("SELECT")) {
      return {
        all: () => this._rows.slice()
      };
    }
    return {
      run: () => {
      },
      all: () => []
    };
  }
};
try {
  BetterSqlite = require("better-sqlite3");
} catch {
  BetterSqlite = InMemorySQLite;
}
var LocalVectorDB = class {
  constructor(opts) {
    if (!opts || typeof opts.dim !== "number" || opts.dim <= 0) {
      throw new Error("LocalVectorDB: `dim` must be a positive integer");
    }
    try {
      this.db = new BetterSqlite(opts.dbPath || ":memory:");
    } catch {
      this.db = new InMemorySQLite();
      this.jsFallback = true;
    }
    this.dim = opts.dim;
    let fallback = false;
    try {
      sqliteVec.load(this.db);
    } catch {
      fallback = true;
    }
    this.jsFallback = fallback;
    const colsSql = `id TEXT PRIMARY KEY, vector BLOB NOT NULL, meta TEXT`;
    this.db.exec(`CREATE TABLE IF NOT EXISTS embeddings (${colsSql})`);
    try {
      this.db.exec(`CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings(vector)`);
    } catch {
    }
  }
  /** Insert or replace a vector together with user metadata. */
  upsert(id, vector, meta = {}) {
    if (vector.length !== this.dim) {
      throw new Error(`Vector dimensionality mismatch (expected ${this.dim}, got ${vector.length})`);
    }
    const buf = (0, import_pgvector.toSql)(vector);
    const json = JSON.stringify(meta ?? {});
    const stmt = this.db.prepare(
      `INSERT INTO embeddings (id, vector, meta) VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET vector = excluded.vector, meta = excluded.meta`
    );
    stmt.run(id, buf, json);
  }
  /** Find the `k` vectors nearest to `query` using cosine similarity.  */
  search(query, k = 8) {
    if (query.length !== this.dim) {
      throw new Error(`Query dimensionality mismatch (expected ${this.dim}, got ${query.length})`);
    }
    if (!this.jsFallback) {
      const buf = (0, import_pgvector.toSql)(query);
      const rows = this.db.prepare(
        `SELECT id, vector, meta, cosine_distance(vector, ?) AS dist
           FROM embeddings
           ORDER BY dist ASC
           LIMIT ?`
      ).all(buf, k);
      const haveValidDist = rows.length > 0 && typeof rows[0].dist === "number" && !Number.isNaN(rows[0].dist);
      if (haveValidDist) {
        return rows.map((r) => ({
          id: r.id,
          score: 1 - r.dist,
          // convert distance → similarity
          meta: r.meta ? JSON.parse(r.meta) : void 0
        }));
      }
    }
    const all = this.db.prepare(`SELECT id, vector, meta FROM embeddings`).all();
    const results = all.map((row) => {
      const vec = (0, import_pgvector.fromSql)(row.vector);
      const sim = this.cosineSimilarity(query, vec);
      return { id: row.id, score: sim, meta: row.meta ? JSON.parse(row.meta) : void 0 };
    });
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, k);
  }
  /** Pure JS cosine similarity – avoids extra deps when sqlite-vec unavailable. */
  cosineSimilarity(a, b) {
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    if (magA === 0 || magB === 0) return 0;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  LocalVectorDB,
  TOKENS_MODEL,
  buildBundle,
  chunkText,
  estimateTokens,
  parseDocx,
  parseFile,
  parseHtml,
  parseImage,
  parsePdf
});
//# sourceMappingURL=index.cjs.map