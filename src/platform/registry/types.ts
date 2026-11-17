export const SDK_REGISTRY_SCHEMA_VERSION = 1;

export type RegistryFileKind = 'wasm' | 'catalog';
export type RegistryFileStatus = 'available' | 'downloaded';
export type ExecutionMode = 'wasm';

export type RegistryFile = {
  kind: RegistryFileKind;
  path: string;
  sha256: string;
  status: RegistryFileStatus;
};

export type CatalogRegistryListing = {
  id: string;
  title: string;
  description: string;
  categories: Array<{
    id: string;
    title: string;
    description: string;
    path: string;
  }>;
};

export type RegistryPendingAsset = {
  path: string;
  size: number;
  sha256: string;
};

export type SDKRegistry = {
  schema_version: typeof SDK_REGISTRY_SCHEMA_VERSION;
  engine: {
    version?: string;
    min_engine?: string;
  };
  source: {
    wasm?: string;
    catalog?: string;
  };
  files: Record<string, RegistryFile>;
  catalog: {
    manifestSha256: string;
    listing: CatalogRegistryListing;
    loaded: string[];
  };
  execution: {
    mode?: ExecutionMode;
  };
  updates: {
    core: boolean;
    catalog: boolean;
  };
  pending: {
    wasmSha256?: string;
    catalogManifestSha256?: string;
    catalogMinEngine?: string;
    catalogAssets?: RegistryPendingAsset[];
  };
};
