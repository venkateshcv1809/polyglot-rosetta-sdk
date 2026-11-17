import { type KeyValueCache, type LoadThroughCacheOptions } from './types';

export type { KeyValueCache, LoadThroughCacheOptions } from './types';
export { createCacheApiStore } from './cache-api';
export { createIndexedDbStore } from './indexed-db';
export { createNodeFileCache } from './node-file';

export function createLazyCache(create: () => KeyValueCache): () => KeyValueCache {
  let cache: KeyValueCache | undefined;
  return () => {
    cache ??= create();
    return cache;
  };
}

export async function loadThroughCache(
  cache: KeyValueCache,
  options: LoadThroughCacheOptions,
): Promise<Uint8Array> {
  const cachedBytes = await cache.get(options.cacheKey);

  if (cachedBytes && (!options.matches || (await options.matches(cachedBytes)))) {
    return cachedBytes;
  }

  const bytes = await options.download();

  if (options.persist !== false) {
    await cache.set(options.cacheKey, bytes);
  }

  return bytes;
}
