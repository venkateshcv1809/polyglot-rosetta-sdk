import { createIndexedDbStore, createLazyCache, createNodeFileCache } from '../cache';

const REGISTRY_RECORD_KEY = 'current';
const REGISTRY_FILE_NAME = 'registry.json';
const REGISTRY_DATABASE_NAME = 'prosetta-sdk';
const REGISTRY_STORE_NAME = 'registry';

const getRegistryCache = createLazyCache(
  () =>
    createNodeFileCache(() => REGISTRY_FILE_NAME) ??
    createIndexedDbStore(REGISTRY_DATABASE_NAME, REGISTRY_STORE_NAME),
);

export async function getRegistryRecord(): Promise<Uint8Array | undefined> {
  return getRegistryCache().get(REGISTRY_RECORD_KEY);
}

export async function setRegistryRecord(bytes: Uint8Array): Promise<void> {
  await getRegistryCache().set(REGISTRY_RECORD_KEY, bytes);
}
