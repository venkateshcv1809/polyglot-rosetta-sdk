import { getConfig } from '../../config/index';
import {
  PROSETTA_WASM_EXEC_FILE_NAME,
  PROSETTA_WASM_FILE_NAME,
  WASM_PATH_REQUIRED_ERROR,
} from '../../config/constants';
import { getRegistryFile, loadRegistry } from '../../platform/registry';
import { type ProsettaCoreApi } from '../../platform/host/types';
import { requireSource } from '../../shared/source';
import {
  downloadWasmAsset,
  fetchReleaseChecksums,
  fetchWasmChecksum,
  loadCachedWasm,
} from './assets';
import { getProsettaCore, startProsettaCore } from './runtime';

let pendingStart: Promise<ProsettaCoreApi> | undefined;
let startGeneration = 0;

export function wasmSource(): string {
  return requireSource(getConfig().PROSETTA_WASM_PATH, WASM_PATH_REQUIRED_ERROR);
}

export function loadWasm(): Promise<ProsettaCoreApi> {
  const started = getProsettaCore();

  if (started) {
    return Promise.resolve(started);
  }

  if (pendingStart) {
    return pendingStart;
  }

  const generation = startGeneration;
  pendingStart = startInstalledCore().finally(() => {
    if (generation === startGeneration) {
      pendingStart = undefined;
    }
  });
  return pendingStart;
}

export function unloadWasm(): void {
  startGeneration += 1;
  pendingStart = undefined;
}

export async function inspectWasmChecksum(): Promise<string | undefined> {
  return fetchWasmChecksum(wasmSource());
}

export async function installWasm(expectedWasmChecksum?: string): Promise<{
  wasmSha256: string;
  wasmExecSha256: string;
}> {
  const source = wasmSource();
  const checksums = await fetchReleaseChecksums(source);
  const wasm = await downloadWasmAsset(source, PROSETTA_WASM_FILE_NAME, expectedWasmChecksum ?? checksums.wasm);
  const wasmExec = await downloadWasmAsset(
    source,
    PROSETTA_WASM_EXEC_FILE_NAME,
    checksums.wasmExec,
  );
  return { wasmSha256: wasm.sha256, wasmExecSha256: wasmExec.sha256 };
}

async function startInstalledCore(): Promise<ProsettaCoreApi> {
  const registry = await loadRegistry();
  const wasmFile = getRegistryFile(registry, 'wasm', PROSETTA_WASM_FILE_NAME);
  const execFile = getRegistryFile(registry, 'wasm', PROSETTA_WASM_EXEC_FILE_NAME);
  const wasmBytes =
    wasmFile?.status === 'downloaded' && wasmFile.sha256
      ? await loadCachedWasm(wasmFile.sha256)
      : undefined;
  const execBytes =
    execFile?.status === 'downloaded' && execFile.sha256
      ? await loadCachedWasm(execFile.sha256)
      : undefined;

  if (!wasmBytes || !execBytes) {
    throw new Error('WASM is not installed in the SDK cache. Call init() or update() first.');
  }

  return startProsettaCore(wasmBytes, new TextDecoder().decode(execBytes));
}
