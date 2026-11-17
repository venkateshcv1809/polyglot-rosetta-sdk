import { readFileFromDirectory } from './filesystem';
import { assertMaxBytes, fetchBytes } from './http';
import { canUseLocalFiles } from './node-runtime';
import { isHttpUrl, joinUrl } from './url';

const LOCAL_FILES_REQUIRED_ERROR =
  'Loading a local asset requires Node.js with process.getBuiltinModule().';

export function requireSource(value: string | undefined, missingError: string): string {
  if (!value) {
    throw new Error(missingError);
  }

  if (!isHttpUrl(value) && !canUseLocalFiles()) {
    throw new Error(LOCAL_FILES_REQUIRED_ERROR);
  }

  return value;
}

export async function readSourceFile(
  source: string,
  fileName: string,
  maxBytes?: number,
): Promise<Uint8Array> {
  if (!isHttpUrl(source)) {
    const bytes = await readFileFromDirectory(source, fileName);
    assertMaxBytes(bytes, fileName, maxBytes);
    return bytes;
  }

  return fetchBytes(joinUrl(source, fileName), fileName, {
    cache: 'no-store',
    maxBytes,
  });
}
