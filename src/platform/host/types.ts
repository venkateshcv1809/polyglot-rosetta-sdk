export const HOST_API_VERSION = 1;
export const SCHEMA_VERSION = 1;

export type BindResult = {
  host_api_version: number;
  schema_version: number;
  status: string;
  ok: boolean;
  error?: string;
};

export type Program = {
  schema_version: number;
  session_id: string;
  language: string;
  entry: string;
  files: Record<string, string>;
  build_required: boolean;
  timeout_ms: number;
};

export type BuildResult = {
  schema_version: number;
  session_id: string;
  build_duration_ms?: number;
  error?: string;
};

export type CaseRequest = {
  schema_version: number;
  session_id: string;
  index: number;
  args: string[];
  timeout_ms: number;
  max_output_bytes: number;
};

export type CaseResult = {
  schema_version: number;
  session_id: string;
  index: number;
  stdout: string;
  stderr: string;
  exit_code: number;
  timed_out: boolean;
  stdout_truncated?: boolean;
  stderr_truncated?: boolean;
  error?: string;
};

export type ProbeTool = {
  binary: string;
  available: boolean;
  path?: string;
  version?: string;
  error?: string;
};

export type ProbeToolchain = {
  language: string;
  available: boolean;
  tools: ProbeTool[];
};

export type CacheEntry = {
  required: string[];
  available: boolean;
  unavailable?: string[];
};

export type CacheSnapshot = {
  schema_version: number;
  languages: Record<string, CacheEntry>;
};

export type HostCallbacks = {
  refreshCache: () => { toolchains: ProbeToolchain[] } | Promise<{ toolchains: ProbeToolchain[] }>;
  ensureAvailable: (language: string) => CacheSnapshot | Promise<CacheSnapshot>;
  buildProgram: (program: Program) => BuildResult | Promise<BuildResult>;
  runCase: (request: CaseRequest) => CaseResult | Promise<CaseResult>;
  disposeProgram: (sessionId: string) => void | Promise<void>;
  clearCache?: () => void | Promise<void>;
};

export type ProsettaCoreApi = {
  bind(host: HostCallbacks): BindResult;
  catalog(...args: unknown[]): { status?: string; error?: string };
  probe(request?: unknown): Promise<unknown>;
  run(request: unknown): Promise<unknown>;
  help(method?: string): unknown;
  version(): unknown;
};

export type RunRequest = {
  id: string;
  language: string;
  source: string;
  mode?: 'public' | 'all';
};
