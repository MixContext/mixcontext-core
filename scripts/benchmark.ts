#!/usr/bin/env tsx
import { performance } from 'node:perf_hooks';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import { parseFile } from '../src/parsers';
import { chunkText } from '../src/chunk';
import { UnsupportedMimeError } from '../src/errors';

interface Row {
  file: string;
  parseMs: number;
  chunkMs: number;
  sizeKB: number;
}

function formatMs(n: number) {
  return n.toFixed(1);
}
function formatKB(n: number) {
  return (n).toFixed(1);
}

async function main() {
  const patterns = process.argv.slice(2);
  if (patterns.length === 0) {
    console.error('Usage: benchmark <files...> (globs allowed)');
    process.exit(1);
  }
  const paths = await fg(patterns, { absolute: true, dot: false });
  if (paths.length === 0) {
    console.error('No input files matched.');
    process.exit(1);
  }

  const rows: Row[] = [];
  let totalBytes = 0;
  let totalParseMs = 0;
  let totalChunkMs = 0;

  for (const p of paths) {
    const buf = await fs.readFile(p);
    const sizeKB = buf.length / 1024;

    const t0 = performance.now();
    let doc;
    try {
      doc = await parseFile(buf);
    } catch (err) {
      if (err instanceof UnsupportedMimeError) {
        // Ignore unsupported files (e.g. docx before parser implemented)
        continue;
      }
      throw err;
    }

    const parseMs = performance.now() - t0;

    const t1 = performance.now();
    await chunkText(doc.text);
    const chunkMs = performance.now() - t1;

    rows.push({ file: path.basename(p), parseMs, chunkMs, sizeKB });

    totalBytes += buf.length;
    totalParseMs += parseMs;
    totalChunkMs += chunkMs;
  }

  if (rows.length) {
    console.table(
      rows.map(r => ({
        File: r.file,
        'Size (KB)': formatKB(r.sizeKB),
        'Parse (ms)': formatMs(r.parseMs),
        'Chunk (ms)': formatMs(r.chunkMs)
      }))
    );
  } else {
    console.log('No supported files parsed.');
  }

  if (totalBytes > 0) {
    const totalMB = totalBytes / 1048576;
    const totalMs = totalParseMs + totalChunkMs;
    const mbps = totalMB / (totalMs / 1000);

    console.log(
      `Total: ${totalMB.toFixed(2)} MB, ${totalMs.toFixed(1)} ms  ⇒  ${mbps.toFixed(
        2
      )} MB/s`
    );

    // Emit machine-readable throughput for CI badge generation
    console.log(`THROUGHPUT_MB_PER_S=${mbps.toFixed(2)}`);
  }

  console.log('Benchmark complete');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
