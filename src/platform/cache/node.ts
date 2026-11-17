import { getNodeBuiltin, getNodeProcess } from '../../shared/node-runtime';

type FileSystem = {
  promises: {
    readFile(path: string): Promise<Uint8Array>;
    writeFile(path: string, data: Uint8Array): Promise<void>;
    mkdir(path: string, options: { recursive: true }): Promise<void>;
    rename(from: string, to: string): Promise<void>;
  };
};

type PathModule = {
  join(...parts: string[]): string;
};

type NodeCrypto = {
  createHash(name: string): {
    update(value: string): { digest(encoding: 'hex'): string };
  };
};

function getNodeCacheContext(): {
  fileSystem: FileSystem;
  path: PathModule;
  crypto: NodeCrypto;
  directory: string;
  pid: number | undefined;
} | undefined {
  const fileSystem = getNodeBuiltin<FileSystem>('fs');
  const path = getNodeBuiltin<PathModule>('path');
  const crypto = getNodeBuiltin<NodeCrypto>('crypto');
  const nodeProcess = getNodeProcess();

  if (!fileSystem?.promises || !path?.join || !crypto?.createHash || !nodeProcess) {
    return undefined;
  }

  const environment = nodeProcess.env ?? {};
  const home = environment.HOME ?? environment.USERPROFILE;
  const cacheRoot = getCacheRoot(environment, home, nodeProcess.platform);

  if (!cacheRoot) {
    return undefined;
  }

  return {
    fileSystem,
    path,
    crypto,
    directory: path.join(cacheRoot, 'prosetta-sdk', 'assets'),
    pid: nodeProcess.pid,
  };
}

export function canUseNodeCache(): boolean {
  return getNodeCacheContext() !== undefined;
}

export async function getNodeCacheEntry(key: string): Promise<Uint8Array | undefined> {
  const context = getNodeCacheContext();

  if (!context) {
    return undefined;
  }

  const cacheKey = context.crypto.createHash('sha256').update(key).digest('hex');
  const filePath = context.path.join(context.directory, `${cacheKey}.bin`);

  try {
    return await context.fileSystem.promises.readFile(filePath);
  } catch {
    return undefined;
  }
}

export async function setNodeCacheEntry(key: string, bytes: Uint8Array): Promise<void> {
  const context = getNodeCacheContext();

  if (!context) {
    return;
  }

  const cacheKey = context.crypto.createHash('sha256').update(key).digest('hex');
  const filePath = context.path.join(context.directory, `${cacheKey}.bin`);
  const temporaryPath = `${filePath}.${context.pid ?? Date.now()}.${Math.random()
    .toString(16)
    .slice(2)}.tmp`;

  try {
    await context.fileSystem.promises.mkdir(context.directory, { recursive: true });
    await context.fileSystem.promises.writeFile(temporaryPath, bytes);
    await context.fileSystem.promises.rename(temporaryPath, filePath);
  } catch {
    // Cache writes are best-effort and must not fail WASM loading.
  }
}

function getCacheRoot(
  environment: Record<string, string | undefined>,
  home: string | undefined,
  platform: string | undefined,
): string | undefined {
  if (environment.XDG_CACHE_HOME) {
    return environment.XDG_CACHE_HOME;
  }

  if (platform === 'win32') {
    return environment.LOCALAPPDATA ?? (home ? `${home}\\AppData\\Local` : undefined);
  }

  if (platform === 'darwin') {
    return home ? `${home}/Library/Caches` : undefined;
  }

  return home ? `${home}/.cache` : undefined;
}
