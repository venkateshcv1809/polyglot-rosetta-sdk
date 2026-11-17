import { toArrayBuffer } from '../../shared/bytes';
import { type ProsettaCoreApi } from '../../platform/host/types';

type GoInstance = {
  importObject: WebAssembly.Imports;
  run(instance: WebAssembly.Instance): Promise<void>;
};

type GoConstructor = new () => GoInstance;

type GoGlobals = typeof globalThis & {
  Go?: GoConstructor;
  ProsettaCore?: ProsettaCoreApi;
};

const CORE_WAIT_TICKS = 200;

export function installWasmExec(source: string): void {
  const globals = globalThis as GoGlobals;

  if (typeof globals.Go === 'function') {
    return;
  }

  const loader = new Function(source);
  loader();

  if (typeof globals.Go !== 'function') {
    throw new Error('wasm_exec.js did not register globalThis.Go.');
  }
}

export async function startProsettaCore(
  wasmBytes: Uint8Array,
  wasmExecSource: string,
): Promise<ProsettaCoreApi> {
  installWasmExec(wasmExecSource);

  const Go = (globalThis as GoGlobals).Go;

  if (!Go) {
    throw new Error('Go WASM loader is not available.');
  }

  const go = new Go();
  const result = await WebAssembly.instantiate(toArrayBuffer(wasmBytes), go.importObject);
  void go.run(result.instance);
  return waitForProsettaCore();
}

export function getProsettaCore(): ProsettaCoreApi | undefined {
  return (globalThis as GoGlobals).ProsettaCore;
}

export function requireProsettaCore(): ProsettaCoreApi {
  const core = getProsettaCore();

  if (!core) {
    throw new Error('ProsettaCore is not started. Call init() first.');
  }

  return core;
}

async function waitForProsettaCore(): Promise<ProsettaCoreApi> {
  for (let tick = 0; tick < CORE_WAIT_TICKS; tick += 1) {
    const core = getProsettaCore();

    if (core) {
      return core;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  }

  throw new Error('Timed out waiting for globalThis.ProsettaCore after starting Go.');
}
