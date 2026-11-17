import { getNodeBuiltin } from './node-runtime';

export type NodeFileSystem = {
  promises: {
    readFile(path: string): Promise<Uint8Array>;
    writeFile(path: string, data: Uint8Array): Promise<void>;
    mkdir(path: string, options: { recursive: true }): Promise<void>;
    rename(from: string, to: string): Promise<void>;
    access(path: string): Promise<void>;
  };
};

export type NodePath = {
  join(...parts: string[]): string;
  dirname(path: string): string;
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
