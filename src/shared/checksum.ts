import { getNodeBuiltin } from './node-runtime';
import { toArrayBuffer } from './bytes';

type NodeCrypto = {
  createHash(name: string): {
    update(value: string | Uint8Array): { digest(encoding: 'hex'): string };
  };
};

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

export async function verifySha256(
  bytes: Uint8Array,
  expectedChecksum: string,
  resourceUrl: string,
): Promise<void> {
  const actualChecksum = await sha256Hex(bytes);

  if (actualChecksum !== expectedChecksum) {
    throw new Error(
      `SHA-256 mismatch for WASM from ${resourceUrl}: expected ${expectedChecksum}, received ${actualChecksum}`,
    );
  }
}
