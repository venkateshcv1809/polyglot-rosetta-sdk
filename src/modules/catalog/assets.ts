import {
  CATALOG_URL_REQUIRED_ERROR,
  PROSETTA_CATALOG_MANIFEST_FILE_NAME,
  PROSETTA_CATALOG_MANIFEST_MAX_BYTES,
} from '../../config/constants';
import { getConfig } from '../../config/index';
import { blobCacheKey, getBlobCacheStore, loadCachedBlob } from '../../platform/blob-cache';
import { assertIntegrity } from '../../shared/checksum';
import { readSourceFile, requireSource } from '../../shared/source';
import { isHttpUrl, joinUrl } from '../../shared/url';
import { type CatalogAsset } from './manifest';

export function resolveCatalogSource(): string {
  return requireSource(getConfig().PROSETTA_CATALOG_URL, CATALOG_URL_REQUIRED_ERROR);
}

export async function loadCachedCatalogAsset(sha256: string): Promise<Uint8Array | undefined> {
  return getBlobCacheStore().get(blobCacheKey('catalog', sha256));
}

export async function loadManifestBytes(source: string): Promise<Uint8Array> {
  return readSourceFile(source, PROSETTA_CATALOG_MANIFEST_FILE_NAME, PROSETTA_CATALOG_MANIFEST_MAX_BYTES);
}

export async function loadVerifiedAsset(source: string, asset: CatalogAsset): Promise<Uint8Array> {
  return loadCachedBlob({
    cacheKey: blobCacheKey('catalog', asset.sha256),
    download: async () => {
      const bytes = await readSourceFile(source, asset.path, asset.size);
      await assertIntegrity(
        bytes,
        asset,
        isHttpUrl(source) ? joinUrl(source, asset.path) : asset.path,
      );
      return bytes;
    },
  });
}
