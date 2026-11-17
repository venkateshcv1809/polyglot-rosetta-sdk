import { PROSETTA_CATALOG_URL_ENV, PROSETTA_WASM_PATH_ENV } from './config.mts';

export { PROSETTA_CATALOG_URL_ENV, PROSETTA_WASM_PATH_ENV };
export const PROSETTA_WASM_VERSION = 'v0.9.1';
export const PROSETTA_WASM_FILE_NAME = 'prosetta.wasm';
export const PROSETTA_WASM_EXEC_FILE_NAME = 'wasm_exec.js';
export const PROSETTA_WASM_CHECKSUMS_FILE_NAME = 'SHA256SUMS';

export const PROSETTA_CATALOG_MANIFEST_FILE_NAME = 'manifest.json';
export const PROSETTA_CATALOG_INDEX_FILE_NAME = 'index.json';
export const PROSETTA_CATALOG_TEMPLATES_FILE_NAME = 'templates.tar.gz';
export const PROSETTA_CATALOG_ARCHIVE_SUFFIX = '.tar.gz';
export const PROSETTA_CATALOG_MANIFEST_MAX_BYTES = 1 << 20;
export const PROSETTA_CATALOG_ASSET_MAX_BYTES = 128 << 20;
export const PROSETTA_CATALOG_MAX_CATEGORIES = 1000;
export const PROSETTA_CATALOG_NODE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const WASM_PATH_REQUIRED_ERROR =
  `Set ${PROSETTA_WASM_PATH_ENV} to a local directory or an HTTP(S) release directory URL.`;

export const CATALOG_URL_REQUIRED_ERROR =
  `Set ${PROSETTA_CATALOG_URL_ENV} to a local catalog directory or an HTTP(S) catalog directory URL.`;
