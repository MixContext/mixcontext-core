import { describe, it, expect } from 'vitest';
import { execa } from 'execa';
import path from 'path';

// Smoke-test the benchmark script. We only check that it runs and prints a
// summary line – precise timings would be too flaky across environments.
describe('benchmark script', () => {
  it('runs on fixture set and prints Total line', async () => {
    const script = path.join(__dirname, '..', 'scripts', 'benchmark.ts');
    const fixturesGlob = path.join(__dirname, 'fixtures', '*.*');

    const { stdout, exitCode } = await execa('tsx', [script, fixturesGlob]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Benchmark complete');
  }, 20_000);
});
