export const PROSETTA_WASM_PATH_ENV = 'PROSETTA_WASM_PATH';

export const WASM_PATH_REQUIRED_ERROR =
  `Set ${PROSETTA_WASM_PATH_ENV} to the local prosetta.wasm file.`;

export const NODE_WASM_LOADER_REQUIRED_ERROR =
  'Loading a local WASM file requires Node.js with process.getBuiltinModule().';
