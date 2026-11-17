import { getBrowserCacheEntry, setBrowserCacheEntry } from './browser';
import { canUseNodeCache, getNodeCacheEntry, setNodeCacheEntry } from './node';

export async function getCacheEntry(key: string): Promise<Uint8Array | undefined> {
  return canUseNodeCache() ? getNodeCacheEntry(key) : getBrowserCacheEntry(key);
}

export async function setCacheEntry(key: string, bytes: Uint8Array): Promise<void> {
  if (canUseNodeCache()) {
    await setNodeCacheEntry(key, bytes);
    return;
  }

  await setBrowserCacheEntry(key, bytes);
}
