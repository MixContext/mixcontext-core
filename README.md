# mixcontext-core

Core engine for **MixContext** — written in TypeScript, framework‑agnostic, no React required.

| Function | Purpose |
|----------|---------|
| `parseFile(file: File\|Buffer)` | Detect type → parse to plain text |
| `chunkText(text: string)` | Split into ~500‑token slices |
| `estimateTokens(text: string)` | Rough token count (chars ÷ 4.2) |
| `buildBundle(docs, opts)` | Produce a `.mcx.zip` (`mixcontext.json` + originals) |

---

## Installation

```bash
pnpm add @mixcontext/core
```

## Quick Usage

```ts
import { parseFile, buildBundle } from "@mixcontext/core";

async function pack(files: File[]) {
  const docs = await Promise.all(files.map(parseFile));
  const blob = await buildBundle(docs, { embed: false });
  saveAs(blob, `mixcontext_${Date.now()}.zip`);
}
```

---

## Roadmap

- [ ] OCR parser (`tesseract.js`)
- [ ] PPTX parser
- [ ] WASM embeddings (llama.cpp)
- [ ] Hybrid search helpers (BM25 + vectors)

---

> **License:** MIT © 2025 MixContext.ai
