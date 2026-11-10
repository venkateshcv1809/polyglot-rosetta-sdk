import { getConfig } from '../config/index';
import {
  NODE_WASM_LOADER_REQUIRED_ERROR,
  WASM_PATH_REQUIRED_ERROR,
} from '../config/constants';

type NodeRuntime = {
  getBuiltinModule?: (name: string) => unknown;
};

type FileSystemPromises = {
  readFile(path: string): Promise<Uint8Array>;
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

  if (isHttpUrl(wasmPath)) {
    const response = await fetch(wasmPath);

    if (!response.ok) {
      throw new Error(
        `Failed to download WASM from ${wasmPath}: ${response.status} ${response.statusText}`,
      );
    }

    return WebAssembly.compile(await response.arrayBuffer());
  }

  const nodeProcess = (globalThis as typeof globalThis & { process?: NodeRuntime }).process;

  const fs = nodeProcess?.getBuiltinModule?.('fs') as
    | { promises: FileSystemPromises }
    | undefined;

  if (!fs) {
    throw new Error(NODE_WASM_LOADER_REQUIRED_ERROR);
  }

  const wasmBytes = await fs.promises.readFile(wasmPath);
  return WebAssembly.compile(wasmBytes as BufferSource);
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}
