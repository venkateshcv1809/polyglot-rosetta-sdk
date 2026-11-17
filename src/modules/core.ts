import { requireProsettaCore } from './wasm/runtime';
import { type RunRequest } from '../platform/host/types';

export async function probe(request?: string | { language?: string; clear?: boolean }): Promise<unknown> {
  return requireProsettaCore().probe(request);
}

export function help(method?: string): unknown {
  return requireProsettaCore().help(method);
}

export function version(): unknown {
  return requireProsettaCore().version();
}

export async function run(request: RunRequest): Promise<unknown> {
  return requireProsettaCore().run({
    id: request.id,
    language: request.language,
    source: request.source,
    mode: request.mode ?? 'public',
  });
}
