import { PROSETTA_WASM_PATH_ENV } from './config.mts';

export { PROSETTA_WASM_PATH_ENV };
export const PROSETTA_WASM_VERSION = 'v0.9.1';
export const PROSETTA_WASM_FILE_NAME = 'prosetta.wasm';
export const PROSETTA_WASM_CHECKSUMS_FILE_NAME = 'SHA256SUMS';

export const WASM_PATH_REQUIRED_ERROR =
  `Set ${PROSETTA_WASM_PATH_ENV} to a local directory or an HTTP(S) release directory URL.`;

export const NODE_WASM_LOADER_REQUIRED_ERROR =
  'Loading a local WASM asset requires Node.js with process.getBuiltinModule().';
