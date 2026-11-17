import {
  PROSETTA_WASM_EXEC_FILE_NAME,
  PROSETTA_WASM_FILE_NAME,
  PROSETTA_WASM_VERSION,
} from './config/constants';
import { activateCatalog, inspectCatalog, installCatalog, unloadCatalog, updateCatalog, type CatalogInspection } from './modules/catalog/index';
import { loadWasm, inspectWasmChecksum, installWasm, unloadWasm, wasmSource } from './modules/wasm/index';
import { bindHost, setExecutionCallbacks, setTypescriptReady } from './platform/host';
import {
  buildTypeScriptProgram,
  disposeTypeScriptProgram,
  runTypeScriptProgram,
} from './platform/host/typescript/index';
import { type ProsettaCoreApi } from './platform/host/types';
import {
  getRegistryFile,
  loadRegistry,
  saveRegistry,
  setRegistryFile,
  unloadRegistry,
  type SDKRegistry,
} from './platform/registry';

export type UpdateFlags = {
  core: boolean;
  catalog: boolean;
};

export type InitResult = {
  core: ProsettaCoreApi;
  updates: UpdateFlags;
};

export async function init(): Promise<InitResult> {
  const registry = await loadRegistry();
  const wasmPath = wasmSource();
  const latestWasmSha256 = await inspectWasmChecksum();
  const catalogInspection = await inspectCatalog();

  registry.source.wasm = wasmPath;
  registry.engine.version = PROSETTA_WASM_VERSION;
  registry.execution.mode = 'wasm';
  registry.pending = {
    wasmSha256: latestWasmSha256,
    catalogManifestSha256: catalogInspection.manifestSha256,
    catalogMinEngine: catalogInspection.minEngine,
    catalogAssets: catalogInspection.assets,
  };

  const hasCore = isCoreInstalled(registry);
  const hasCatalog = Boolean(registry.catalog.manifestSha256);
  const installedWasm = getRegistryFile(registry, 'wasm', PROSETTA_WASM_FILE_NAME);

  registry.updates.core =
    hasCore && Boolean(latestWasmSha256) && installedWasm?.sha256 !== latestWasmSha256;
  registry.updates.catalog = hasCatalog && registry.catalog.manifestSha256 !== catalogInspection.manifestSha256;

  if (!hasCore) {
    await installCore(registry, latestWasmSha256);
    registry.updates.core = false;
  }

  if (!hasCatalog) {
    await installCatalog(catalogInspection);
    const updated = await loadRegistry();
    copyRegistryState(registry, updated);
    registry.updates.catalog = false;
  }

  await saveRegistry(registry);
  return startBoundCore(registry.updates);
}

export async function update(): Promise<InitResult> {
  const registry = await loadRegistry();

  if (registry.updates.core) {
    await installCore(registry, registry.pending.wasmSha256);
    registry.updates.core = false;
  }

  if (registry.updates.catalog && registry.pending.catalogManifestSha256 && registry.pending.catalogAssets) {
    const inspection: CatalogInspection = {
      manifestSha256: registry.pending.catalogManifestSha256,
      minEngine: registry.pending.catalogMinEngine,
      assets: registry.pending.catalogAssets,
    };
    await updateCatalog(inspection);
    const updated = await loadRegistry();
    copyRegistryState(registry, updated);
    registry.updates.catalog = false;
  }

  await saveRegistry(registry);
  unloadWasm();
  return startBoundCore(registry.updates);
}

export async function hasUpdates(): Promise<UpdateFlags> {
  const registry = await loadRegistry();
  return { ...registry.updates };
}

export async function shutdown(): Promise<void> {
  const registry = await loadRegistry();
  await saveRegistry(registry);
  unloadWasm();
  unloadCatalog();
  unloadRegistry();
}

async function startBoundCore(updates: UpdateFlags): Promise<InitResult> {
  const core = await loadWasm();
  setTypescriptReady(true);
  setExecutionCallbacks({
    buildProgram: buildTypeScriptProgram,
    runCase: runTypeScriptProgram,
    disposeProgram: disposeTypeScriptProgram,
  });
  bindHost(core);
  await activateCatalog(core);
  return { core, updates: { ...updates } };
}

function isCoreInstalled(registry: SDKRegistry): boolean {
  const wasm = getRegistryFile(registry, 'wasm', PROSETTA_WASM_FILE_NAME);
  const wasmExec = getRegistryFile(registry, 'wasm', PROSETTA_WASM_EXEC_FILE_NAME);
  return wasm?.status === 'downloaded' && Boolean(wasm.sha256) && wasmExec?.status === 'downloaded' && Boolean(wasmExec.sha256);
}

async function installCore(registry: SDKRegistry, expectedChecksum?: string): Promise<void> {
  const installed = await installWasm(expectedChecksum);
  registry.source.wasm = wasmSource();
  registry.engine.version = PROSETTA_WASM_VERSION;
  registry.execution.mode = 'wasm';
  setRegistryFile(registry, {
    kind: 'wasm',
    path: PROSETTA_WASM_FILE_NAME,
    sha256: installed.wasmSha256,
    status: 'downloaded',
  });
  setRegistryFile(registry, {
    kind: 'wasm',
    path: PROSETTA_WASM_EXEC_FILE_NAME,
    sha256: installed.wasmExecSha256,
    status: 'downloaded',
  });
}

function copyRegistryState(target: SDKRegistry, source: SDKRegistry): void {
  target.files = source.files;
  target.catalog = source.catalog;
  target.engine.min_engine = source.engine.min_engine;
  target.source.catalog = source.source.catalog;
}
