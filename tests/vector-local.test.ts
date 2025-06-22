import { describe, it, expect, vi } from 'vitest';

// Mock better-sqlite3 so tests run without native bindings
vi.mock('better-sqlite3', () => {
  class MockStmt {
    #rows: any[];
    constructor(rowsRef: any[]) { this.#rows = rowsRef; }
    run() {/* no-op */}
    all() { return this.#rows; }
  }

  class MockDB {
    rows: any[] = [];
    prepare() {
      const rowsRef = this.rows;
      return {
        run: (id: string, vecBuf: Buffer, metaJson: string) => {
          // Store row so SELECT all() can later retrieve
          const idx = rowsRef.findIndex(r => r.id === id);
          const row = { id, vector: vecBuf, meta: metaJson };
          if (idx >= 0) rowsRef[idx] = row; else rowsRef.push(row);
        },
        all: () => rowsRef
      } as any;
    }
    exec() {/* no-op */}
  }
  const factory = function(this: any) { return new MockDB(); };
  factory.prototype = MockDB.prototype;
  return { default: factory };
});

import { LocalVectorDB } from '../src/vector/local';

describe('LocalVectorDB', () => {
  it('returns nearest vector by cosine similarity', () => {
    const db = new LocalVectorDB({ dim: 6 });

    const a = [1, 0, 0, 0, 0, 0];
    const b = [0, 1, 0, 0, 0, 0];
    const c = [0, 0, 1, 0, 0, 0];

    db.upsert('a', a, { label: 'A' });
    db.upsert('b', b, { label: 'B' });
    db.upsert('c', c, { label: 'C' });

    const query = [0.9, 0.1, 0, 0, 0, 0];
    const res = db.search(query, 2);

    expect(res[0].id).toBe('a');
    expect(res[0].score).toBeGreaterThan(res[1].score);
  });
});

// Mock sqlite-vec so the call to sqliteVec.load(db) is a no-op
vi.mock('sqlite-vec', () => ({ load: () => {} }));
