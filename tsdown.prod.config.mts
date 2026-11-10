import { defineConfig } from 'tsdown';
import developmentConfig from './tsdown.config.mts';

export default defineConfig(
  developmentConfig.map((target) => ({
    ...target,
    sourcemap: false,
    minify: true,
  })),
);
