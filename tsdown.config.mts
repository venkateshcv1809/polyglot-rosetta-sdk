import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    outDir: 'dist/npm',
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
  },
  {
    entry: ['src/index.ts'],
    outDir: 'dist',
    format: ['iife'],
    globalName: 'ProsettaSDK',
    platform: 'browser',
    minify: false,
    sourcemap: true,
    dts: false,
    clean: false,
    outputOptions: {
      entryFileNames: 'prosetta-sdk.js',
    },
  },
]);
