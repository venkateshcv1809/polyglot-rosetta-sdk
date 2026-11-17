import {
  createCacheApiStore,
  createLazyCache,
  createNodeFileCache,
  loadThroughCache,
  type KeyValueCache,
  type LoadThroughCacheOptions,
} from '../cache';

const BLOB_CACHE_NAME = 'prosetta-sdk-assets-v1';

const getBlobCache = createLazyCache(
  (): KeyValueCache =>
    createNodeFileCache((key, hashKey) => `assets/${hashKey(key)}.bin`) ??
    createCacheApiStore(BLOB_CACHE_NAME),
);

export function blobCacheKey(kind: 'wasm' | 'catalog', sha256: string): string {
  return `prosetta-${kind}-asset:${sha256}`;
}

export function getBlobCacheStore(): KeyValueCache {
  return getBlobCache();
}

export async function loadCachedBlob(options: LoadThroughCacheOptions): Promise<Uint8Array> {
  return loadThroughCache(getBlobCache(), options);
}
