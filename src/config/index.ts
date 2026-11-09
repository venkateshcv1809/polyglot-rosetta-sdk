import { PROSETTA_WASM_PATH_ENV } from './constants';

type NodeRuntime = {
  env: Record<string, string | undefined>;
};

export type SDKConfig = {
  wasmPath: string | undefined;
};

export function getConfig(): SDKConfig {
  const nodeProcess = (globalThis as typeof globalThis & { process?: NodeRuntime }).process;

  return {
    wasmPath: nodeProcess?.env[PROSETTA_WASM_PATH_ENV],
  };
}
