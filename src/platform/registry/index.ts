import { encodeJsonBytes, isRecord, optionalString, parseJsonBytes } from '../../shared/json';
import { getRegistryRecord, setRegistryRecord } from '../registry-cache';
import {
  SDK_REGISTRY_SCHEMA_VERSION,
  type RegistryFile,
  type RegistryFileKind,
  type RegistryPendingAsset,
  type SDKRegistry,
} from './types';

export type {
  CatalogRegistryListing,
  ExecutionMode,
  RegistryFile,
  RegistryFileKind,
  RegistryFileStatus,
  SDKRegistry,
} from './types';

export { SDK_REGISTRY_SCHEMA_VERSION } from './types';

let loaded: SDKRegistry | undefined;

export function emptyRegistry(): SDKRegistry {
  return {
    schema_version: SDK_REGISTRY_SCHEMA_VERSION,
    engine: {},
    source: {},
    files: {},
    catalog: {
      manifestSha256: '',
      listing: { id: '', title: '', description: '', categories: [] },
      loaded: [],
    },
    execution: {},
    updates: {
      core: false,
      catalog: false,
    },
    pending: {},
  };
}

export function registryFileKey(kind: RegistryFileKind, path: string): string {
  return `${kind}:${path}`;
}

export function getRegistryFile(
  registry: SDKRegistry,
  kind: RegistryFileKind,
  path: string,
): RegistryFile | undefined {
  return registry.files[registryFileKey(kind, path)];
}

export function isDownloaded(
  registry: SDKRegistry,
  kind: RegistryFileKind,
  path: string,
  sha256: string,
): boolean {
  const file = getRegistryFile(registry, kind, path);
  return file?.status === 'downloaded' && file.sha256 === sha256;
}

export function setRegistryFile(registry: SDKRegistry, file: RegistryFile): void {
  registry.files[registryFileKey(file.kind, file.path)] = file;
}

export async function loadRegistry(): Promise<SDKRegistry> {
  if (loaded) {
    return loaded;
  }

  const bytes = await getRegistryRecord();

  if (!bytes) {
    loaded = emptyRegistry();
    return loaded;
  }

  try {
    loaded = parseRegistry(parseJsonBytes(bytes, 'sdk registry'));
  } catch {
    loaded = emptyRegistry();
  }

  return loaded;
}

export async function saveRegistry(registry: SDKRegistry): Promise<void> {
  loaded = registry;
  await setRegistryRecord(encodeJsonBytes(registry));
}

export function unloadRegistry(): void {
  loaded = undefined;
}

function parseRegistry(value: unknown): SDKRegistry {
  if (!isRecord(value) || value.schema_version !== SDK_REGISTRY_SCHEMA_VERSION) {
    return emptyRegistry();
  }

  const engine = isRecord(value.engine) ? value.engine : {};
  const source = isRecord(value.source) ? value.source : {};
  const execution = isRecord(value.execution) ? value.execution : {};
  const catalog = isRecord(value.catalog) ? value.catalog : {};
  const listing = isRecord(catalog.listing) ? catalog.listing : {};
  const files = parseFiles(value.files);

  return {
    schema_version: SDK_REGISTRY_SCHEMA_VERSION,
    engine: {
      version: optionalString(engine.version),
      min_engine: optionalString(engine.min_engine),
    },
    source: {
      wasm: optionalString(source.wasm),
      catalog: optionalString(source.catalog),
    },
    files,
    catalog: {
      manifestSha256: optionalString(catalog.manifestSha256) ?? '',
      listing: {
        id: optionalString(listing.id) ?? '',
        title: optionalString(listing.title) ?? '',
        description: optionalString(listing.description) ?? '',
        categories: Array.isArray(listing.categories) ? listing.categories.filter(isListingCategory) : [],
      },
      loaded: Array.isArray(catalog.loaded)
        ? catalog.loaded.filter((id): id is string => typeof id === 'string')
        : [],
    },
    execution: {
      mode: execution.mode === 'wasm' ? 'wasm' : undefined,
    },
    updates: {
      core: isRecord(value.updates) ? value.updates.core === true : false,
      catalog: isRecord(value.updates) ? value.updates.catalog === true : false,
    },
    pending: parsePending(value.pending),
  };
}

function parsePending(value: unknown): SDKRegistry['pending'] {
  if (!isRecord(value)) {
    return {};
  }

  return {
    wasmSha256: optionalString(value.wasmSha256),
    catalogManifestSha256: optionalString(value.catalogManifestSha256),
    catalogMinEngine: optionalString(value.catalogMinEngine),
    catalogAssets: Array.isArray(value.catalogAssets)
      ? value.catalogAssets.filter(isPendingAsset)
      : undefined,
  };
}

function isPendingAsset(value: unknown): value is RegistryPendingAsset {
  return (
    isRecord(value) &&
    typeof value.path === 'string' &&
    typeof value.sha256 === 'string' &&
    typeof value.size === 'number'
  );
}

function parseFiles(value: unknown): Record<string, RegistryFile> {
  if (!isRecord(value)) {
    return {};
  }

  const files: Record<string, RegistryFile> = {};

  for (const [key, entry] of Object.entries(value)) {
    if (
      !isRecord(entry) ||
      (entry.kind !== 'wasm' && entry.kind !== 'catalog') ||
      typeof entry.path !== 'string' ||
      typeof entry.sha256 !== 'string' ||
      (entry.status !== 'available' && entry.status !== 'downloaded')
    ) {
      continue;
    }

    files[key] = {
      kind: entry.kind,
      path: entry.path,
      sha256: entry.sha256,
      status: entry.status,
    };
  }

  return files;
}

function isListingCategory(
  value: unknown,
): value is SDKRegistry['catalog']['listing']['categories'][number] {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.description === 'string' &&
    typeof value.path === 'string'
  );
}
