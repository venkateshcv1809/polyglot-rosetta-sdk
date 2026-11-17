import { getConfig } from '../../config/index';
import { toArrayBuffer } from '../../shared/bytes';
import { PROSETTA_WASM_FILE_NAME, WASM_PATH_REQUIRED_ERROR } from '../../config/constants';
import { getRegistryFile, loadRegistry } from '../../platform/registry';
import { requireSource } from '../../shared/source';
import { downloadWasmAsset, fetchWasmChecksum, loadCachedWasm } from './assets';

let cachedModule: WebAssembly.Module | undefined;
let pendingLoad: Promise<WebAssembly.Module> | undefined;
let loadGeneration = 0;

export function wasmSource(): string {
  return requireSource(getConfig().PROSETTA_WASM_PATH, WASM_PATH_REQUIRED_ERROR);
}

export function loadWasm(): Promise<WebAssembly.Module> {
  if (cachedModule) {
    return Promise.resolve(cachedModule);
  }

  if (pendingLoad) {
    return pendingLoad;
  }

  const generation = loadGeneration;
  const load = compileInstalledWasm();
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

export async function inspectWasmChecksum(): Promise<string | undefined> {
  return fetchWasmChecksum(wasmSource());
}

export async function installWasm(expectedChecksum?: string): Promise<string> {
  const { sha256 } = await downloadWasmAsset(wasmSource(), expectedChecksum);
  return sha256;
}

async function compileInstalledWasm(): Promise<WebAssembly.Module> {
  const registry = await loadRegistry();
  const file = getRegistryFile(registry, 'wasm', PROSETTA_WASM_FILE_NAME);
  const bytes = file?.status === 'downloaded' && file.sha256
    ? await loadCachedWasm(file.sha256)
    : undefined;

  if (!bytes) {
    throw new Error('WASM is not installed in the SDK cache. Call init() or update() first.');
  }

  return WebAssembly.compile(toArrayBuffer(bytes));
}
