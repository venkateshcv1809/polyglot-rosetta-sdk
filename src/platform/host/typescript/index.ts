import { SCHEMA_VERSION, type BuildResult, type CaseRequest, type CaseResult, type Program } from '../types';
import { disposeSession, getSession, saveSession } from '../sessions';
import { stubBuildProgram } from '../execution';
import { jsPath, transpileTypeScriptFiles } from './transpile';
import { runTypeScriptCase } from './run-case';

export async function buildTypeScriptProgram(program: Program): Promise<BuildResult> {
  if (program.language !== 'typescript') {
    return stubBuildProgram(program);
  }

  const started = Date.now();

  try {
    const files = transpileTypeScriptFiles(program.files);
    saveSession(program, files, jsPath(program.entry));
    return {
      schema_version: SCHEMA_VERSION,
      session_id: program.session_id,
      build_duration_ms: Date.now() - started,
    };
  } catch (error) {
    return {
      schema_version: SCHEMA_VERSION,
      session_id: program.session_id,
      build_duration_ms: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function runTypeScriptProgram(request: CaseRequest): Promise<CaseResult> {
  const session = getSession(request.session_id);

  if (!session || session.language !== 'typescript') {
    return {
      schema_version: SCHEMA_VERSION,
      session_id: request.session_id,
      index: request.index,
      stdout: '',
      stderr: '',
      exit_code: -1,
      timed_out: false,
      error: 'TypeScript session is not prepared.',
    };
  }

  return runTypeScriptCase(session, request);
}

export async function disposeTypeScriptProgram(sessionId: string): Promise<void> {
  disposeSession(sessionId);
}
