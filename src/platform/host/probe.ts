import { blobCacheKey, getBlobCacheStore } from '../blob-cache';
import {
  SCHEMA_VERSION,
  type CacheSnapshot,
  type ProbeToolchain,
} from './types';

const SNAPSHOT_KEY = blobCacheKey('wasm', 'probe-snapshot');
const LANGUAGES = ['go', 'python', 'rust', 'typescript', 'zig'] as const;

export const TYPESCRIPT_TOOLS = ['tsc'];

export function unavailableToolchain(language: string, tools: string[], error: string): ProbeToolchain {
  return {
    language,
    available: false,
    tools: tools.map((binary) => ({ binary, available: false, error })),
  };
}

export function typescriptToolchain(available: boolean): ProbeToolchain {
  return {
    language: 'typescript',
    available,
    tools: TYPESCRIPT_TOOLS.map((binary) => ({
      binary,
      available,
      path: available ? 'sdk:typescript' : undefined,
      error: available ? undefined : 'TypeScript execution is not bound.',
    })),
  };
}

export async function readProbeSnapshot(): Promise<CacheSnapshot> {
  const bytes = await getBlobCacheStore().get(SNAPSHOT_KEY);

  if (!bytes) {
    return emptySnapshot();
  }

  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as CacheSnapshot;
  } catch {
    return emptySnapshot();
  }
}

export async function writeProbeSnapshot(snapshot: CacheSnapshot): Promise<void> {
  await getBlobCacheStore().set(SNAPSHOT_KEY, new TextEncoder().encode(JSON.stringify(snapshot)));
}

export async function clearProbeSnapshot(): Promise<void> {
  await writeProbeSnapshot(emptySnapshot());
}

export function snapshotFromToolchains(toolchains: ProbeToolchain[]): CacheSnapshot {
  const languages: CacheSnapshot['languages'] = {};

  for (const toolchain of toolchains) {
    languages[toolchain.language] = {
      required: toolchain.tools.map((tool) => tool.binary),
      available: toolchain.available,
      unavailable: toolchain.available
        ? undefined
        : toolchain.tools.filter((tool) => !tool.available).map((tool) => tool.binary),
    };
  }

  return { schema_version: SCHEMA_VERSION, languages };
}

export function emptySnapshot(): CacheSnapshot {
  return { schema_version: SCHEMA_VERSION, languages: {} };
}

export function defaultToolchains(typescriptAvailable: boolean): ProbeToolchain[] {
  const missing = 'No execution host is bound for this language.';
  return [
    unavailableToolchain('go', ['go'], missing),
    unavailableToolchain('python', ['python3'], missing),
    unavailableToolchain('rust', ['rustc'], missing),
    typescriptToolchain(typescriptAvailable),
    unavailableToolchain('zig', ['zig'], missing),
  ];
}

export { LANGUAGES };
