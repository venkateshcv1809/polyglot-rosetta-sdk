import { toArrayBuffer } from './bytes';
import { isRecord, toFiniteNumber } from './json';
import { getNodeBuiltin, type NodeCrypto } from './node-runtime';

export function parseSha256Sums(contents: string, assetName: string): string {
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^([a-f\d]{64})\s+\*?(.+)$/i);

    if (match?.[2] === assetName) {
      return match[1].toLowerCase();
    }
  }

  throw new Error(`SHA256SUMS does not contain a SHA-256 checksum for ${assetName}.`);
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const nodeCrypto = getNodeBuiltin<NodeCrypto>('crypto');

  if (nodeCrypto?.createHash) {
    return nodeCrypto.createHash('sha256').update(bytes).digest('hex');
  }

  const digest = await globalThis.crypto.subtle.digest('SHA-256', toArrayBuffer(bytes));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export type Integrity = {
  size?: number;
  sha256: string;
};

export type HashedAsset = {
  path: string;
  size: number;
  sha256: string;
};

export function parseHashedAsset(value: unknown, invalidMessage: string): HashedAsset {
  if (!isRecord(value) || typeof value.path !== 'string') {
    throw new Error(invalidMessage);
  }

  return {
    path: value.path,
    size: toFiniteNumber(value.size),
    sha256: typeof value.sha256 === 'string' ? value.sha256.toLowerCase() : '',
  };
}

export function assertHashedAssetMetadata(asset: HashedAsset, maxBytes: number): void {
  if (
    asset.size <= 0 ||
    asset.size > maxBytes ||
    asset.sha256.length !== 64 ||
    !/^[a-f\d]{64}$/.test(asset.sha256)
  ) {
    throw new Error(`invalid integrity metadata for "${asset.path}"`);
  }
}

export async function verifySha256(
  bytes: Uint8Array,
  expectedChecksum: string,
  resourceUrl: string,
): Promise<void> {
  const actualChecksum = await sha256Hex(bytes);

  if (actualChecksum !== expectedChecksum) {
    throw new Error(
      `SHA-256 mismatch for ${resourceUrl}: expected ${expectedChecksum}, received ${actualChecksum}`,
    );
  }
}

export async function matchesIntegrity(bytes: Uint8Array, expected: Integrity): Promise<boolean> {
  if (expected.size !== undefined && bytes.byteLength !== expected.size) {
    return false;
  }

  return (await sha256Hex(bytes)) === expected.sha256;
}

export async function assertIntegrity(
  bytes: Uint8Array,
  expected: Integrity,
  resource: string,
): Promise<void> {
  if (expected.size !== undefined && bytes.byteLength !== expected.size) {
    throw new Error(
      `integrity check failed for ${resource}: expected ${expected.size} bytes, received ${bytes.byteLength}`,
    );
  }

  await verifySha256(bytes, expected.sha256, resource);
}
