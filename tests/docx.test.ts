import { describe, it, expect } from 'vitest';
import { Document, Packer, Paragraph } from 'docx';
import { parseDocx } from '../src/parsers/docx';
import { promises as fs } from 'fs';
import path from 'path';

async function createSampleDocxBuffer(): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [new Paragraph('Hello MixContext! This is a sample DOCX.')]
      }
    ]
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

describe('DOCX parser', () => {
  it('extracts text and creates chunks', async () => {
    const docxBuffer = await createSampleDocxBuffer();

    const fixturesDir = path.join(__dirname, 'fixtures');
    await fs.mkdir(fixturesDir, { recursive: true });
    await fs.writeFile(path.join(fixturesDir, 'sample.docx'), docxBuffer);

    const doc = await parseDocx(docxBuffer);
    expect(doc.text.length).toBeGreaterThan(10);
    expect(doc.chunks?.length).toBeGreaterThan(0);
  });
});
