import { toArrayBuffer } from '../../shared/bytes';

const BROWSER_CACHE_NAME = 'prosetta-sdk-assets-v1';

export async function getBrowserCacheEntry(key: string): Promise<Uint8Array | undefined> {
  try {
    const cache = await globalThis.caches?.open(BROWSER_CACHE_NAME);
    const response = await cache?.match(key);
    return response ? new Uint8Array(await response.arrayBuffer()) : undefined;
  } catch {
    return undefined;
  }
}

export async function setBrowserCacheEntry(key: string, bytes: Uint8Array): Promise<void> {
  try {
    const cache = await globalThis.caches?.open(BROWSER_CACHE_NAME);
    await cache?.put(key, new Response(toArrayBuffer(bytes)));
  } catch {
    // Storage can be unavailable or full; caching is best-effort.
  }
}
