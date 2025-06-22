import { defineConfig } from 'tsup';

export default defineConfig([
  // Existing Node + CLI bundle
  {
    entry: {
      index: 'src/index.ts',
      'cli/index': 'cli/index.ts'
    },
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    format: ['esm', 'cjs'],
    platform: 'node',
    outExtension: ({ format }) => ({
      js: format === 'cjs' ? '.cjs' : format === 'esm' ? '.mjs' : '.js'
    }),
    external: ['@aws-sdk/client-s3']
  },
  // Lightweight browser-only WASM bundle
  {
    entry: { browser: 'src/browser.ts' },
    format: ['esm'],
    splitting: false,
    platform: 'browser',
    treeshake: true,
    skipNodeModulesBundle: true,
    clean: false,
    outExtension: () => ({ js: '.wasm.js' })
  },
  // Global IIFE bundle for direct <script> usage (browser)
  {
    entry: { 'index.iife': 'src/browser.ts' },
    format: ['iife'],
    platform: 'browser',
    splitting: false,
    treeshake: true,
    clean: false,
    outExtension: () => ({ js: '.js' })
  }
]);
