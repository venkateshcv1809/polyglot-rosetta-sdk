import { asUint8Array } from '../../shared/bytes';
import { type KeyValueCache } from './types';

export function createIndexedDbStore(databaseName: string, storeName: string): KeyValueCache {
  const cache: KeyValueCache = {
    async has(key) {
      return (await cache.get(key)) !== undefined;
    },
    async get(key) {
      try {
        const database = await openDatabase(databaseName, storeName);
        return await new Promise((resolve, reject) => {
          const request = database.transaction(storeName, 'readonly').objectStore(storeName).get(key);
          request.onsuccess = () => resolve(asUint8Array(request.result));
          request.onerror = () => reject(request.error);
        });
      } catch {
        return undefined;
      }
    },
    async set(key, bytes) {
      try {
        const database = await openDatabase(databaseName, storeName);
        await new Promise<void>((resolve, reject) => {
          const transaction = database.transaction(storeName, 'readwrite');
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
          transaction.objectStore(storeName).put(bytes, key);
        });
      } catch {
        // IndexedDB can be unavailable or full; caching is best-effort.
      }
    },
  };

  return cache;
}

function openDatabase(databaseName: string, storeName: string): Promise<IDBDatabase> {
  const indexedDB = globalThis.indexedDB;

  if (!indexedDB) {
    return Promise.reject(new Error('IndexedDB is not available.'));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName)) {
        request.result.createObjectStore(storeName);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
