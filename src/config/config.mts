export const PROSETTA_WASM_PATH_ENV = 'PROSETTA_WASM_PATH';

type NodeRuntime = {
  env: Record<string, string | undefined>;
};

const DEFAULT_CONFIG = {
  [PROSETTA_WASM_PATH_ENV]: undefined as string | undefined,
};

export type SDKConfig = typeof DEFAULT_CONFIG;

declare const __PROSETTA_CONFIG__: SDKConfig | undefined;

export function getConfig(): SDKConfig {
  const nodeProcess = (globalThis as typeof globalThis & { process?: NodeRuntime }).process;
  const buildConfig =
    typeof __PROSETTA_CONFIG__ === 'undefined' ? DEFAULT_CONFIG : __PROSETTA_CONFIG__;

  return Object.fromEntries(
    Object.keys(DEFAULT_CONFIG).map((name) => [
      name,
      buildConfig[name as keyof SDKConfig] || nodeProcess?.env[name],
    ]),
  ) as SDKConfig;
}
