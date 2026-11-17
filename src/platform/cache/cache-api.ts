import { toArrayBuffer } from '../../shared/bytes';
import { type KeyValueCache } from './types';

export function createCacheApiStore(cacheName: string): KeyValueCache {
  return {
    async has(key) {
      try {
        return Boolean(await (await open(cacheName))?.match(key));
      } catch {
        return false;
      }
    },
    async get(key) {
      try {
        const response = await (await open(cacheName))?.match(key);
        return response ? new Uint8Array(await response.arrayBuffer()) : undefined;
      } catch {
        return undefined;
      }
    },
    async set(key, bytes) {
      try {
        await (await open(cacheName))?.put(key, new Response(toArrayBuffer(bytes)));
      } catch {
        // Storage can be unavailable or full; caching is best-effort.
      }
    },
  };
}

function open(cacheName: string): Promise<Cache> | undefined {
  return globalThis.caches?.open(cacheName);
}
