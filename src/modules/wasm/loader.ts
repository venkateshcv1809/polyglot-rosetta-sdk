import { getConfig } from '../../config/index';
import { toArrayBuffer } from '../../shared/bytes';
import {
  NODE_WASM_LOADER_REQUIRED_ERROR,
  WASM_PATH_REQUIRED_ERROR,
} from '../../config/constants';
import { isHttpUrl } from '../../shared/url';
import { loadWasmBytes } from './assets';

type NodeRuntime = {
  getBuiltinModule?: (name: string) => unknown;
};

let cachedModule: WebAssembly.Module | undefined;
let pendingLoad: Promise<WebAssembly.Module> | undefined;
let loadGeneration = 0;

export function loadWasm(): Promise<WebAssembly.Module> {
  if (cachedModule) {
    return Promise.resolve(cachedModule);
  }

  if (pendingLoad) {
    return pendingLoad;
  }

  const generation = loadGeneration;
  const load = compileWasm();
  pendingLoad = load;

  return load.then(
    (module) => {
      if (generation === loadGeneration) {
        cachedModule = module;
      }
      return module;
    },
  ).finally(() => {
    if (generation === loadGeneration) {
      pendingLoad = undefined;
    }
  });
}

export function unloadWasm(): void {
  loadGeneration += 1;
  cachedModule = undefined;
  pendingLoad = undefined;
}

async function compileWasm(): Promise<WebAssembly.Module> {
  const { PROSETTA_WASM_PATH: wasmPath } = getConfig();

  if (!wasmPath) {
    throw new Error(WASM_PATH_REQUIRED_ERROR);
  }

  if (!isHttpUrl(wasmPath) && !hasNodeFileSystem()) {
    throw new Error(NODE_WASM_LOADER_REQUIRED_ERROR);
  }

  return WebAssembly.compile(toArrayBuffer(await loadWasmBytes(wasmPath)));
}

function hasNodeFileSystem(): boolean {
  const nodeProcess = (globalThis as typeof globalThis & { process?: NodeRuntime }).process;
  return Boolean(nodeProcess?.getBuiltinModule?.('fs'));
}
