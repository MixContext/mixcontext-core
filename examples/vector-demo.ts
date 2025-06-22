import path from 'node:path';
import { promises as fs } from 'node:fs';
import fg from 'fast-glob';
import { parseFile } from '../src/parsers';
import { chunkText } from '../src/chunk';
import { embedChunks } from '../src/embed';
import { LocalVectorDB } from '../src/vector/local';

// Ensure offline mode for embeddings in this demo
process.env.MIXCONTEXT_MOCK_EMBED = '1';

async function main() {
  const pdfGlob = path.join(__dirname, '..', 'tests', 'fixtures', '*.pdf');
  const files = await fg(pdfGlob);
  if (files.length === 0) throw new Error('No PDF fixtures found');

  const dbPath = path.join(__dirname, 'demo.db');

  let vdb: LocalVectorDB | undefined;

  for (const f of files) {
    const buf = await fs.readFile(f);
    const doc = await parseFile(buf);

    // chunk+embed (mock provider using MIXCONTEXT_MOCK_EMBED for demo)
    doc.chunks = await embedChunks(await chunkText(doc.text), {
      provider: 'local', // will hit mock
      endpoint: 'http://localhost:0',
      model: 'text-embedding-3-small'
    });

    // upsert
    for (const c of doc.chunks) {
      if (!c.embedding) continue;
      if (!vdb) {
        vdb = new LocalVectorDB({ dim: c.embedding.length, dbPath });
      }
      vdb.upsert(`${doc.id}-${c.idx}`, c.embedding, { file: path.basename(f), chunkIdx: c.idx });
    }
  }

  if (!vdb) throw new Error('No vectors inserted.');

  // Query vector from question
  const query = 'What is this doc about?';
  const queryEmbedding = (await embedChunks([{ idx: 0, text: query }], {
    provider: 'local',
    endpoint: 'http://localhost:0',
    model: 'text-embedding-3-small'
  }))[0].embedding!;

  const results = vdb.search(queryEmbedding, 5);
  console.log('Top matches:', results);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
