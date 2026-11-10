import { PROSETTA_WASM_PATH_ENV } from './config.mts';

export const WASM_PATH_REQUIRED_ERROR =
  `Set ${PROSETTA_WASM_PATH_ENV} to a local prosetta.wasm path or an HTTP(S) URL.`;

export const NODE_WASM_LOADER_REQUIRED_ERROR =
  'Loading a local WASM file requires Node.js with process.getBuiltinModule().';
