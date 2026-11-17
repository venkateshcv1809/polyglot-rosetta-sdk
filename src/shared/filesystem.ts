import { getNodeBuiltin } from './node-runtime';

type NodeFileSystem = {
  promises: {
    readFile(path: string): Promise<Uint8Array>;
  };
};

type NodePath = {
  join(...parts: string[]): string;
};

export async function readFileFromDirectory(
  directory: string,
  fileName: string,
): Promise<Uint8Array> {
  const fileSystem = getNodeBuiltin<NodeFileSystem>('fs');
  const path = getNodeBuiltin<NodePath>('path');

  if (!fileSystem?.promises || !path?.join) {
    throw new Error('Reading local assets requires Node.js.');
  }

  return fileSystem.promises.readFile(path.join(directory, fileName));
}
