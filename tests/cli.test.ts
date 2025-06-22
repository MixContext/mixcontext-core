import { describe, it, expect } from 'vitest';
import { execa } from 'execa';
import path from 'path';
import { promises as fs, createWriteStream } from 'fs';
import PDFDocument from 'pdfkit';

// Build a temp pdf to feed cli
async function buildPdf(tmpPath: string) {
  return new Promise<void>(resolve => {
    const doc = new PDFDocument();
    const out = createWriteStream(tmpPath);
    doc.pipe(out);
    doc.text('CLI test pdf. '.repeat(20));
    doc.end();
    out.on('finish', () => resolve());
  });
}

describe('mixcontext CLI', () => {
  it('creates bundle file', async () => {
    const tmpDir = path.join(__dirname, 'tmp');
    await fs.mkdir(tmpDir, { recursive: true });
    const pdfPath = path.join(tmpDir, 'cli.pdf');
    await buildPdf(pdfPath);

    const outPath = path.join(tmpDir, 'bundle.zip');
    const cliTs = path.join(__dirname, '..', 'cli', 'index.ts');

    // Run the TypeScript CLI using `tsx` instead of Node + ts-node loader. `tsx`
    // has first-class support for ESM and avoids the circular `require()`
    // issue that appears on Node 24 when using `ts-node/esm`.
    const { exitCode } = await execa('tsx', [cliTs, pdfPath, '--out', outPath]);
    expect(exitCode).toBe(0);

    const stat = await fs.stat(outPath);
    expect(stat.size).toBeGreaterThan(1000);
  }, 20_000);

  it('writes config file with --init', async () => {
    const tmpDir = path.join(__dirname, 'tmp');
    await fs.mkdir(tmpDir, { recursive: true });
    const cliTs = path.join(__dirname, '..', 'cli', 'index.ts');

    const { exitCode } = await execa('tsx', [cliTs, '--init', '--no-color'], {
      cwd: tmpDir,
      env: { MIXCONTEXT_MOCK_EMBED: '1' }
    });

    expect(exitCode).toBe(0);
    const cfgPath = path.join(tmpDir, 'mixcontext.config.ts');
    const cfgStat = await fs.stat(cfgPath);
    expect(cfgStat.isFile()).toBe(true);
    const contents = await fs.readFile(cfgPath, 'utf8');
    expect(contents).toMatch(/const config: BuildOpts/);
  }, 10_000);

  it('shows dual progress bars when embedding enabled', async () => {
    const tmpDir = path.join(__dirname, 'tmp');
    await fs.mkdir(tmpDir, { recursive: true });
    const pdfPath = path.join(tmpDir, 'cli.pdf');
    await buildPdf(pdfPath);

    const cliTs = path.join(__dirname, '..', 'cli', 'index.ts');

    const { exitCode, stderr, stdout } = await execa('tsx', [cliTs, pdfPath, '--embed', 'openai', '--openai-key', 'test', '--no-color', '--out', path.join(tmpDir, 'bundle-embed.zip')], {
      env: { MIXCONTEXT_MOCK_EMBED: '1' }
    });

    expect(exitCode).toBe(0);
    const out = `${stdout}\n${stderr}`; // progress bars write to one of the streams
    // strip ANSI escape codes so we can assert plain text output
    const esc = String.fromCharCode(27);
    const clean = out.replace(new RegExp(`${esc}\\[[0-9;]*[A-Za-z]`, 'g'), '');
    expect(clean).toMatch(/parse/);
    expect(clean).toMatch(/embed/);
  }, 20_000);
});
