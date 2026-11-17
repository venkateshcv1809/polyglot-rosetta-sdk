export type FetchOptions = {
  cache?: RequestCache;
  allowNotFound?: boolean;
  maxBytes?: number;
};

export async function fetchResource(
  url: string,
  resourceName: string,
  { cache = 'no-cache', allowNotFound = false }: FetchOptions = {},
): Promise<Response> {
  const response = await fetch(url, { cache });

  if (response.ok || (allowNotFound && response.status === 404)) {
    return response;
  }

  throw new Error(
    `Failed to download ${resourceName} from ${url}: ${response.status} ${response.statusText}`,
  );
}

export async function fetchBytes(
  url: string,
  resourceName: string,
  options: FetchOptions = {},
): Promise<Uint8Array> {
  const response = await fetchResource(url, resourceName, options);
  const bytes = new Uint8Array(await response.arrayBuffer());
  assertMaxBytes(bytes, resourceName, options.maxBytes);
  return bytes;
}

export function assertMaxBytes(
  bytes: Uint8Array,
  resourceName: string,
  maxBytes: number | undefined,
): void {
  if (maxBytes !== undefined && bytes.byteLength > maxBytes) {
    throw new Error(`${resourceName} exceeds size limit of ${maxBytes} bytes`);
  }
}
