import {
  PROSETTA_WASM_CHECKSUMS_FILE_NAME,
  PROSETTA_WASM_FILE_NAME,
  PROSETTA_WASM_VERSION,
} from '../../config/constants';
import { getCacheEntry, setCacheEntry } from '../../platform/cache';
import { parseSha256Sums, sha256Hex, verifySha256 } from '../../shared/checksum';
import { readFileFromDirectory } from '../../shared/filesystem';
import { fetchResource } from '../../shared/http';
import { isHttpUrl, joinUrl } from '../../shared/url';

export async function loadWasmBytes(sourceDirectory: string): Promise<Uint8Array> {
  if (!isHttpUrl(sourceDirectory)) {
    return readFileFromDirectory(sourceDirectory, PROSETTA_WASM_FILE_NAME);
  }

  const releaseDirectory = resolveWasmReleaseDirectory(sourceDirectory);
  const wasmUrl = joinUrl(releaseDirectory, PROSETTA_WASM_FILE_NAME);
  const checksumsUrl = joinUrl(releaseDirectory, PROSETTA_WASM_CHECKSUMS_FILE_NAME);

  const cachedBytes = await getCacheEntry(wasmUrl);
  const expectedChecksum = await downloadLatestChecksum(checksumsUrl);

  if (expectedChecksum && cachedBytes && (await sha256Hex(cachedBytes)) === expectedChecksum) {
    return cachedBytes;
  }

  const bytes = await downloadWasm(wasmUrl, expectedChecksum);

  if (expectedChecksum) {
    await setCacheEntry(wasmUrl, bytes);
  }

  return bytes;
}

async function downloadLatestChecksum(checksumsUrl: string): Promise<string | undefined> {
  const checksumsResponse = await fetchResource(checksumsUrl, PROSETTA_WASM_CHECKSUMS_FILE_NAME, {
    cache: 'no-store',
    allowNotFound: true,
  });

  if (checksumsResponse.status === 404) {
    return undefined;
  }

  return parseSha256Sums(await checksumsResponse.text(), PROSETTA_WASM_FILE_NAME);
}

async function downloadWasm(wasmUrl: string, expectedChecksum: string | undefined): Promise<Uint8Array> {
  const wasmResponse = await fetchResource(wasmUrl, PROSETTA_WASM_FILE_NAME, {
    cache: 'no-store',
  });
  const bytes = new Uint8Array(await wasmResponse.arrayBuffer());

  if (expectedChecksum) {
    await verifySha256(bytes, expectedChecksum, wasmUrl);
  }

  return bytes;
}

function resolveWasmReleaseDirectory(releaseRoot: string): string {
  const url = new URL(releaseRoot);
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
