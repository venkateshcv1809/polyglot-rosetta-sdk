import {
  PROSETTA_WASM_FILE_NAME,
  PROSETTA_WASM_VERSION,
} from './config/constants';
import {
  getRegistryFile,
  loadRegistry,
  saveRegistry,
  setRegistryFile,
  unloadRegistry,
  type SDKRegistry,
} from './platform/registry';
import {
  inspectCatalog,
  installCatalog,
  unloadCatalog,
  updateCatalog,
  type CatalogInspection,
} from './modules/catalog/index';
import { inspectWasmChecksum, installWasm, loadWasm, unloadWasm, wasmSource } from './modules/wasm/index';

export type UpdateFlags = {
  core: boolean;
  catalog: boolean;
};

export type InitResult = {
  wasm: WebAssembly.Module;
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

  const installedWasm = getRegistryFile(registry, 'wasm', PROSETTA_WASM_FILE_NAME);
  const hasCore = installedWasm?.status === 'downloaded' && Boolean(installedWasm.sha256);
  const hasCatalog = Boolean(registry.catalog.manifestSha256);

  registry.updates.core = hasCore && Boolean(latestWasmSha256) && installedWasm.sha256 !== latestWasmSha256;
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
  return { wasm: await loadWasm(), updates: { ...registry.updates } };
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
  return { wasm: await loadWasm(), updates: { ...registry.updates } };
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

async function installCore(registry: SDKRegistry, expectedChecksum?: string): Promise<void> {
  const sha256 = await installWasm(expectedChecksum);
  registry.source.wasm = wasmSource();
  registry.engine.version = PROSETTA_WASM_VERSION;
  registry.execution.mode = 'wasm';
  setRegistryFile(registry, {
    kind: 'wasm',
    path: PROSETTA_WASM_FILE_NAME,
    sha256,
    status: 'downloaded',
  });
}

function copyRegistryState(target: SDKRegistry, source: SDKRegistry): void {
  target.files = source.files;
  target.catalog = source.catalog;
  target.engine.min_engine = source.engine.min_engine;
  target.source.catalog = source.source.catalog;
}
