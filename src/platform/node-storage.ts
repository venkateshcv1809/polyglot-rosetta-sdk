import { type NodeFileSystem, type NodePath } from '../shared/filesystem';
import { getNodeBuiltin, getNodeProcess } from '../shared/node-runtime';

export type NodeSdkContext = {
  fileSystem: NodeFileSystem;
  path: NodePath;
  pid: number | undefined;
  sdkRoot: string;
};

export function getNodeSdkContext(): NodeSdkContext | undefined {
  const fileSystem = getNodeBuiltin<NodeFileSystem>('fs');
  const path = getNodeBuiltin<NodePath>('path');
  const nodeProcess = getNodeProcess();

  if (
    !fileSystem?.promises?.readFile ||
    !fileSystem.promises.writeFile ||
    !fileSystem.promises.access ||
    !path?.join ||
    !path.dirname ||
    !nodeProcess
  ) {
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
    pid: nodeProcess.pid,
    sdkRoot: path.join(cacheRoot, 'prosetta-sdk'),
  };
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
