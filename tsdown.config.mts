import { defineConfig } from 'tsdown';
import { getConfig } from './src/config/config.mts';

const config = getConfig();

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
    define: {
      __PROSETTA_CONFIG__: JSON.stringify(config),
    },
    outputOptions: {
      entryFileNames: 'prosetta-sdk.js',
    },
  },
]);
