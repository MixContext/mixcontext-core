import { describe, it, expect } from 'vitest';
import PDFDocument from 'pdfkit';
import { parsePdf } from '../src/parsers/pdf';
import { buildBundle } from '../src/bundle';
import AdmZip from 'adm-zip';

function createSamplePdfBuffer(): Promise<Buffer> {
  return new Promise<Buffer>(resolve => {
    const doc = new PDFDocument();
    const parts: Buffer[] = [];
    doc.on('data', chunk => parts.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(parts)));
    doc.text('Bundle test PDF.');
    doc.end();
  });
}

describe('Bundle builder', () => {
  it('returns zip larger than mixcontext.json inside', async () => {
    const pdfBuffer = await createSamplePdfBuffer();
    const doc = await parsePdf(pdfBuffer);
    const zipBuffer = await buildBundle([doc], true);

    const zip = new AdmZip(zipBuffer);
    const mixEntry = zip.getEntry('mixcontext.json');
    expect(mixEntry).toBeTruthy();
    const mixSize = mixEntry!.getData().length;
    expect(zipBuffer.length).toBeGreaterThan(mixSize);
  });
});
