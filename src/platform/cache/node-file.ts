import { getNodeBuiltin, type NodeCrypto } from '../../shared/node-runtime';
import { getNodeSdkContext } from '../node-storage';
import { type KeyValueCache } from './types';

export function createNodeFileCache(
  fileForKey: (key: string, hashKey: (value: string) => string) => string | undefined,
): KeyValueCache | undefined {
  const sdk = getNodeSdkContext();
  const crypto = getNodeBuiltin<NodeCrypto>('crypto');

  if (!sdk) {
    return undefined;
  }

  const { fileSystem, path, pid, sdkRoot } = sdk;

  const hashKey = (value: string): string => {
    if (!crypto?.createHash) {
      throw new Error('Hashed cache keys require Node.js crypto.');
    }

    return crypto.createHash('sha256').update(value).digest('hex');
  };

  return {
    async has(key) {
      const destination = resolve(key);

      if (!destination) {
        return false;
      }

      try {
        await fileSystem.promises.access(destination);
        return true;
      } catch {
        return false;
      }
    },
    async get(key) {
      const destination = resolve(key);

      if (!destination) {
        return undefined;
      }

      try {
        return await fileSystem.promises.readFile(destination);
      } catch {
        return undefined;
      }
    },
    async set(key, bytes) {
      const destination = resolve(key);

      if (!destination) {
        return;
      }

      const temporaryPath = `${destination}.${pid ?? Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;

      try {
        await fileSystem.promises.mkdir(path.dirname(destination), { recursive: true });
        await fileSystem.promises.writeFile(temporaryPath, bytes);
        await fileSystem.promises.rename(temporaryPath, destination);
      } catch {
        // Cache writes are best-effort.
      }
    },
  };

  function resolve(key: string): string | undefined {
    try {
      const relativePath = fileForKey(key, hashKey);
      return relativePath ? path.join(sdkRoot, relativePath) : undefined;
    } catch {
      return undefined;
    }
  }
}
