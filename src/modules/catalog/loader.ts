import {
  getRegistryFile,
  isDownloaded,
  loadRegistry,
  saveRegistry,
  setRegistryFile,
  type SDKRegistry,
} from '../../platform/registry';
import { sha256Hex } from '../../shared/checksum';
import {
  loadCachedCatalogAsset,
  loadManifestBytes,
  loadVerifiedAsset,
  resolveCatalogSource,
} from './assets';
import {
  archivePathFromCatalogId,
  catalogIdFromArchive,
  listingFromIndex,
  type CatalogListing,
} from './listing';
import {
  assertCompatibleEngine,
  parseCatalogManifest,
  type CatalogAsset,
  type CatalogManifest,
} from './manifest';

export type CatalogBundle = {
  index: Uint8Array;
  templates: Uint8Array;
  archives: Record<string, Uint8Array>;
};

export type CatalogInspection = {
  manifestSha256: string;
  minEngine?: string;
  assets: CatalogAsset[];
};

export async function inspectCatalog(): Promise<CatalogInspection> {
  const source = resolveCatalogSource();
  const manifestBytes = await loadManifestBytes(source);
  const manifest = parseCatalogManifest(manifestBytes);
  assertCompatibleEngine(manifest.min_engine);

  return {
    manifestSha256: await sha256Hex(manifestBytes),
    minEngine: manifest.min_engine,
    assets: [manifest.index, manifest.templates, ...manifest.categories],
  };
}

export async function installCatalog(inspection: CatalogInspection): Promise<void> {
  const source = resolveCatalogSource();
  const registry = await loadRegistry();
  const manifest = manifestFromInspection(inspection);

  for (const asset of inspection.assets) {
    await loadVerifiedAsset(source, asset);
    markDownloaded(registry, asset);
  }

  const index = inspection.assets.find((asset) => asset.path === manifest.index.path);
  if (index) {
    await writeListing(registry, source, manifest, index);
  }

  registry.source.catalog = source;
  registry.engine.min_engine = inspection.minEngine;
  registry.catalog.manifestSha256 = inspection.manifestSha256;
  registry.catalog.loaded = manifest.categories.map((asset) => catalogIdFromArchive(asset.path));
  await saveRegistry(registry);
}

export async function updateCatalog(inspection: CatalogInspection): Promise<void> {
  const source = resolveCatalogSource();
  const registry = await loadRegistry();
  const manifest = manifestFromInspection(inspection);

  for (const asset of inspection.assets) {
    if (!isDownloaded(registry, 'catalog', asset.path, asset.sha256)) {
      await loadVerifiedAsset(source, asset);
      markDownloaded(registry, asset);
    }
  }

  const index = inspection.assets.find((asset) => asset.path === manifest.index.path);
  if (index) {
    await writeListing(registry, source, manifest, index);
  }

  registry.catalog.manifestSha256 = inspection.manifestSha256;
  registry.engine.min_engine = inspection.minEngine;
  pruneMissingCatalogFiles(registry, inspection.assets);
  await saveRegistry(registry);
}

export async function listCatalog(): Promise<CatalogListing> {
  const registry = await loadRegistry();
  return {
    id: registry.catalog.listing.id,
    title: registry.catalog.listing.title,
    description: registry.catalog.listing.description,
    categories: registry.catalog.listing.categories.map((category) => ({
      id: category.id,
      title: category.title,
      description: category.description,
      downloaded: getRegistryFile(registry, 'catalog', category.path)?.status === 'downloaded',
    })),
  };
}

export async function getCatalog(): Promise<CatalogBundle | undefined> {
  const registry = await loadRegistry();
  const source = registry.source.catalog;

  if (!source || !registry.catalog.manifestSha256) {
    return undefined;
  }

  const indexFile = getRegistryFile(registry, 'catalog', 'index.json');
  const templatesFile = getRegistryFile(registry, 'catalog', 'templates.tar.gz');

  if (
    indexFile?.status !== 'downloaded' ||
    templatesFile?.status !== 'downloaded' ||
    !indexFile.sha256 ||
    !templatesFile.sha256
  ) {
    return undefined;
  }

  const archives: Record<string, Uint8Array> = {};

  for (const category of registry.catalog.listing.categories) {
    const file = getRegistryFile(registry, 'catalog', category.path);

    if (file?.status === 'downloaded') {
      const bytes = await loadCachedCatalogAsset(file.sha256);
      if (bytes) {
        archives[category.path] = bytes;
      }
    }
  }

  const index = await loadCachedCatalogAsset(indexFile.sha256);
  const templates = await loadCachedCatalogAsset(templatesFile.sha256);

  if (!index || !templates || Object.keys(archives).length === 0) {
    return undefined;
  }

  return {
    index,
    templates,
    archives,
  };
}

export async function activateCatalog(core: {
  catalog(...args: unknown[]): { status?: string; error?: string };
}): Promise<{ status?: string; error?: string }> {
  const bundle = await getCatalog();

  if (!bundle) {
    throw new Error('Catalog is not installed in the SDK cache. Call init() or update() first.');
  }

  const activated = core.catalog(bundle.index, bundle.templates, bundle.archives);

  if (activated?.status && activated.status !== 'ok') {
    throw new Error(activated.error || 'ProsettaCore.catalog failed.');
  }

  return activated;
}

export function unloadCatalog(): void {}

function markDownloaded(registry: SDKRegistry, asset: CatalogAsset): void {
  setRegistryFile(registry, {
    kind: 'catalog',
    path: asset.path,
    sha256: asset.sha256,
    status: 'downloaded',
  });
}

async function writeListing(
  registry: SDKRegistry,
  source: string,
  manifest: CatalogManifest,
  index: CatalogAsset,
): Promise<void> {
  const indexBytes = await loadVerifiedAsset(source, index);
  const listing = listingFromIndex(indexBytes, manifest, new Set());
  registry.catalog.listing = {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    categories: listing.categories.map((category) => ({
      id: category.id,
      title: category.title,
      description: category.description,
      path: archivePathFromCatalogId(category.id),
    })),
  };
}

function manifestFromInspection(inspection: CatalogInspection): CatalogManifest {
  const index = inspection.assets.find((asset) => asset.path === 'index.json');
  const templates = inspection.assets.find((asset) => asset.path === 'templates.tar.gz');

  if (!index || !templates) {
    throw new Error('Catalog inspection is missing index or templates.');
  }

  return {
    schema_version: 1,
    min_engine: inspection.minEngine,
    index,
    templates,
    categories: inspection.assets.filter(
      (asset) => asset.path !== index.path && asset.path !== templates.path,
    ),
  };
}

function pruneMissingCatalogFiles(registry: SDKRegistry, assets: CatalogAsset[]): void {
  for (const [key, file] of Object.entries(registry.files)) {
    if (file.kind === 'catalog' && !assets.some((asset) => asset.path === file.path)) {
      delete registry.files[key];
    }
  }
}
