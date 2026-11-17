import {
  PROSETTA_CATALOG_ARCHIVE_SUFFIX,
  PROSETTA_CATALOG_ASSET_MAX_BYTES,
  PROSETTA_CATALOG_INDEX_FILE_NAME,
  PROSETTA_CATALOG_MAX_CATEGORIES,
  PROSETTA_CATALOG_NODE_ID_PATTERN,
  PROSETTA_CATALOG_TEMPLATES_FILE_NAME,
  PROSETTA_WASM_VERSION,
} from '../../config/constants';
import {
  assertHashedAssetMetadata,
  parseHashedAsset,
  type HashedAsset,
} from '../../shared/checksum';
import { isRecord, optionalString, parseJsonBytes } from '../../shared/json';
import { meetsMinimumVersion } from '../../shared/version';

export type CatalogAsset = HashedAsset;

export type CatalogManifest = {
  schema_version: number;
  min_engine?: string;
  index: CatalogAsset;
  templates: CatalogAsset;
  categories: CatalogAsset[];
};

const INVALID_MANIFEST = 'unsupported bundle manifest';

export function parseCatalogManifest(data: Uint8Array): CatalogManifest {
  const parsed = parseJsonBytes(data, 'bundle manifest');

  if (!isRecord(parsed)) {
    throw new Error(INVALID_MANIFEST);
  }

  const index = parseHashedAsset(parsed.index, INVALID_MANIFEST);
  const templates = parseHashedAsset(parsed.templates, INVALID_MANIFEST);
  const categories = parseCategoryList(parsed.categories);

  if (
    parsed.schema_version !== 1 ||
    index.path !== PROSETTA_CATALOG_INDEX_FILE_NAME ||
    templates.path !== PROSETTA_CATALOG_TEMPLATES_FILE_NAME
  ) {
    throw new Error(INVALID_MANIFEST);
  }

  const seen = new Set<string>([
    PROSETTA_CATALOG_INDEX_FILE_NAME,
    PROSETTA_CATALOG_TEMPLATES_FILE_NAME,
  ]);

  for (const asset of [index, templates, ...categories]) {
    assertHashedAssetMetadata(asset, PROSETTA_CATALOG_ASSET_MAX_BYTES);
  }

  for (const asset of categories) {
    const id = asset.path.slice(0, -PROSETTA_CATALOG_ARCHIVE_SUFFIX.length);

    if (
      !asset.path.endsWith(PROSETTA_CATALOG_ARCHIVE_SUFFIX) ||
      !PROSETTA_CATALOG_NODE_ID_PATTERN.test(id) ||
      seen.has(asset.path)
    ) {
      throw new Error(`invalid category archive "${asset.path}"`);
    }

    seen.add(asset.path);
  }

  return {
    schema_version: 1,
    min_engine: optionalString(parsed.min_engine),
    index,
    templates,
    categories,
  };
}

export function assertCompatibleEngine(minEngine: string | undefined): void {
  if (!meetsMinimumVersion(PROSETTA_WASM_VERSION, minEngine)) {
    throw new Error(
      `catalog requires Prosetta ${minEngine} or newer (running ${PROSETTA_WASM_VERSION})`,
    );
  }
}

function parseCategoryList(value: unknown): CatalogAsset[] {
  if (!Array.isArray(value)) {
    throw new Error(INVALID_MANIFEST);
  }

  if (value.length > PROSETTA_CATALOG_MAX_CATEGORIES) {
    throw new Error('too many category archives');
  }

  return value.map((asset) => parseHashedAsset(asset, INVALID_MANIFEST));
}
