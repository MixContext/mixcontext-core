(function (exports) {
  'use strict';

  // src/utils/hash.ts
  async function hashText(text) {
    if (typeof globalThis.crypto?.subtle?.digest === "function") {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const hashBuf = await globalThis.crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuf));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    const { createHash } = await import('crypto');
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
    const push = () => {
      if (buffer.trim().length) {
        chunks.push({ idx: chunks.length, text: buffer.trim() });
        buffer = "";
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

  // src/browser.ts
  async function hashBuffer(buf) {
    let text;
    if (typeof buf === "string") {
      text = buf;
    } else if (buf instanceof Uint8Array) {
      text = new TextDecoder().decode(buf);
    } else {
      text = new TextDecoder().decode(new Uint8Array(buf));
    }
    return hashText(text);
  }
  function estimateTokens(text) {
    return Math.ceil(text.length / 4.2);
  }

  exports.chunkText = chunkText;
  exports.estimateTokens = estimateTokens;
  exports.hashBuffer = hashBuffer;
  exports.hashText = hashText;

  return exports;

})({});
