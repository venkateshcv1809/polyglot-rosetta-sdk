import {
  PROSETTA_WASM_CHECKSUMS_FILE_NAME,
  PROSETTA_WASM_FILE_NAME,
  PROSETTA_WASM_VERSION,
} from '../../config/constants';
import { blobCacheKey, getBlobCacheStore } from '../../platform/blob-cache';
import { parseSha256Sums, sha256Hex, verifySha256 } from '../../shared/checksum';
import { fetchResource } from '../../shared/http';
import { readSourceFile } from '../../shared/source';
import { isHttpUrl, joinUrl } from '../../shared/url';

export function resolveWasmDirectory(source: string): string {
  if (!isHttpUrl(source)) {
    return source;
  }

  const url = new URL(source);
  const normalizedPath = url.pathname.replace(/\/+$/, '');
  const lastSegment = normalizedPath.slice(normalizedPath.lastIndexOf('/') + 1);

  if (lastSegment === PROSETTA_WASM_VERSION) {
    url.pathname = `${normalizedPath}/`;
    return url.toString();
  }

  if (/^v\d/.test(lastSegment)) {
    throw new Error(
      `Configured WASM release directory uses ${lastSegment}; this SDK supports ${PROSETTA_WASM_VERSION}.`,
    );
  }

  if (lastSegment === 'download') {
    const baseUrl = url.toString().endsWith('/') ? url.toString() : `${url.toString()}/`;
    return new URL(`${PROSETTA_WASM_VERSION}/`, baseUrl).toString();
  }

  url.pathname = `${normalizedPath}/`;
  return url.toString();
}

export async function fetchWasmChecksum(source: string): Promise<string | undefined> {
  const directory = resolveWasmDirectory(source);

  if (!isHttpUrl(directory)) {
    return undefined;
  }

  const checksumsUrl = joinUrl(directory, PROSETTA_WASM_CHECKSUMS_FILE_NAME);
  const checksumsResponse = await fetchResource(checksumsUrl, PROSETTA_WASM_CHECKSUMS_FILE_NAME, {
    cache: 'no-store',
    allowNotFound: true,
  });

  if (checksumsResponse.status === 404) {
    return undefined;
  }

  return parseSha256Sums(await checksumsResponse.text(), PROSETTA_WASM_FILE_NAME);
}

export async function loadCachedWasm(sha256: string): Promise<Uint8Array | undefined> {
  return getBlobCacheStore().get(blobCacheKey('wasm', sha256));
}

export async function downloadWasmAsset(
  source: string,
  expectedChecksum?: string,
): Promise<{ bytes: Uint8Array; sha256: string }> {
  const directory = resolveWasmDirectory(source);
  const bytes = await readSourceFile(directory, PROSETTA_WASM_FILE_NAME);
  const sha256 = expectedChecksum ?? (await sha256Hex(bytes));

  if (expectedChecksum) {
    await verifySha256(
      bytes,
      expectedChecksum,
      isHttpUrl(directory) ? joinUrl(directory, PROSETTA_WASM_FILE_NAME) : PROSETTA_WASM_FILE_NAME,
    );
  }

  await getBlobCacheStore().set(blobCacheKey('wasm', sha256), bytes);
  return { bytes, sha256 };
}
