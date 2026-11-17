type NodeProcess = {
  env?: Record<string, string | undefined>;
  platform?: string;
  pid?: number;
  getBuiltinModule?: (name: string) => unknown;
};

export function getNodeProcess(): NodeProcess | undefined {
  return (globalThis as typeof globalThis & { process?: NodeProcess }).process;
}

export function getNodeBuiltin<T>(name: string): T | undefined {
  return getNodeProcess()?.getBuiltinModule?.(name) as T | undefined;
}
