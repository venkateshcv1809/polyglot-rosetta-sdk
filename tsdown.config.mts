import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['umd'],
  globalName: 'ProsettaSDK',
  sourcemap: true,
  outputOptions: {
    entryFileNames: 'prosetta-sdk.js'
  }
});
