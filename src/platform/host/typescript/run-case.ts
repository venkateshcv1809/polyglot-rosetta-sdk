import { getNodeBuiltin } from '../../../shared/node-runtime';
import { SCHEMA_VERSION, type CaseRequest, type CaseResult } from '../types';
import { type PreparedSession } from '../sessions';
import { caseRunnerSource } from './runner-source';

type NodeVm = {
  runInNewContext(code: string, context?: object, options?: { timeout?: number }): unknown;
};

type RunnerOutput = {
  stdout: string;
  stderr: string;
  stdout_truncated?: boolean;
  stderr_truncated?: boolean;
  exit_code: number;
  error?: string;
};

export async function runTypeScriptCase(session: PreparedSession, request: CaseRequest): Promise<CaseResult> {
  const source = caseRunnerSource(session.files, session.entry, request.args, request.max_output_bytes);
  const started = Date.now();

  try {
    const output = await runSource(source, request.timeout_ms);
    return {
      schema_version: SCHEMA_VERSION,
      session_id: request.session_id,
      index: request.index,
      stdout: output.stdout,
      stderr: output.stderr,
      exit_code: output.exit_code,
      timed_out: false,
      stdout_truncated: output.stdout_truncated,
      stderr_truncated: output.stderr_truncated,
      error: output.error,
    };
  } catch (error) {
    const timedOut = Date.now() - started >= request.timeout_ms || isTimeout(error);
    return {
      schema_version: SCHEMA_VERSION,
      session_id: request.session_id,
      index: request.index,
      stdout: '',
      stderr: timedOut ? '' : error instanceof Error ? error.message : String(error),
      exit_code: -1,
      timed_out: timedOut,
      error: timedOut ? undefined : error instanceof Error ? error.message : String(error),
    };
  }
}

async function runSource(source: string, timeoutMs: number): Promise<RunnerOutput> {
  const vm = getNodeBuiltin<NodeVm>('vm');

  if (vm?.runInNewContext) {
    return vm.runInNewContext(source, { performance, TextEncoder, BigInt }, { timeout: timeoutMs }) as RunnerOutput;
  }

  return runInWorker(source, timeoutMs);
}

function runInWorker(source: string, timeoutMs: number): Promise<RunnerOutput> {
  if (typeof Worker !== 'function' || typeof Blob !== 'function') {
    throw new Error('TypeScript cases require Node.js vm or a Worker.');
  }

  return new Promise((resolve, reject) => {
    const blob = new Blob([`postMessage(${source});`], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    const timer = setTimeout(() => {
      worker.terminate();
      URL.revokeObjectURL(url);
      reject(new Error('timeout'));
    }, timeoutMs);

    worker.onmessage = (event: MessageEvent<RunnerOutput>) => {
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve(event.data);
    };
    worker.onerror = (event) => {
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      reject(new Error(event.message));
    };
  });
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error && (error.message === 'timeout' || /timed? ?out/i.test(error.message));
}
