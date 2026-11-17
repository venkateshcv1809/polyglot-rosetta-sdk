import {
  defaultToolchains,
  snapshotFromToolchains,
  writeProbeSnapshot,
  clearProbeSnapshot,
} from './probe';
import { stubBuildProgram, stubDisposeProgram, stubRunCase } from './execution';
import {
  type BindResult,
  type BuildResult,
  type CaseRequest,
  type CaseResult,
  type HostCallbacks,
  type ProsettaCoreApi,
  type Program,
} from './types';

export type ExecutionCallbacks = {
  buildProgram: (program: Program) => BuildResult | Promise<BuildResult>;
  runCase: (request: CaseRequest) => CaseResult | Promise<CaseResult>;
  disposeProgram: (sessionId: string) => void | Promise<void>;
};

let typescriptReady = false;
let execution: ExecutionCallbacks = {
  buildProgram: stubBuildProgram,
  runCase: stubRunCase,
  disposeProgram: stubDisposeProgram,
};

export function setTypescriptReady(ready: boolean): void {
  typescriptReady = ready;
}

export function setExecutionCallbacks(next: ExecutionCallbacks): void {
  execution = next;
}

export function createHostCallbacks(): HostCallbacks {
  return {
    async refreshCache() {
      const toolchains = defaultToolchains(typescriptReady);
      await writeProbeSnapshot(snapshotFromToolchains(toolchains));
      return { toolchains };
    },
    async ensureAvailable(language: string) {
      const snapshot = snapshotFromToolchains(defaultToolchains(typescriptReady));
      await writeProbeSnapshot(snapshot);
      const entry = snapshot.languages[language];

      if (!entry) {
        return {
          schema_version: snapshot.schema_version,
          languages: {
            [language]: { required: [], available: false, unavailable: [language] },
          },
        };
      }

      return snapshot;
    },
    async clearCache() {
      await clearProbeSnapshot();
    },
    buildProgram: (program) => execution.buildProgram(program),
    runCase: (request) => execution.runCase(request),
    disposeProgram: (sessionId) => execution.disposeProgram(sessionId),
  };
}

export function bindHost(core: ProsettaCoreApi): BindResult {
  const result = core.bind(createHostCallbacks());

  if (!result?.ok) {
    throw new Error(result?.error || 'ProsettaCore.bind failed.');
  }

  return result;
}
