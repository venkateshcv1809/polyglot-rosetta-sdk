export type FetchOptions = {
  cache?: RequestCache;
  allowNotFound?: boolean;
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
