import { loadWasm, unloadWasm } from './modules/wasm/index';

export function init(): Promise<WebAssembly.Module> {
  return loadWasm();
}

export function shutdown(): void {
  unloadWasm();
}
