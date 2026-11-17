import { SCHEMA_VERSION, type BuildResult, type CaseRequest, type CaseResult, type Program } from './types';

export function stubBuildProgram(program: Program): BuildResult {
  return {
    schema_version: SCHEMA_VERSION,
    session_id: program.session_id,
    error: `No execution host is bound for ${program.language}.`,
  };
}

export function stubRunCase(request: CaseRequest): CaseResult {
  return {
    schema_version: SCHEMA_VERSION,
    session_id: request.session_id,
    index: request.index,
    stdout: '',
    stderr: '',
    exit_code: -1,
    timed_out: false,
    error: 'No execution host is bound.',
  };
}

export function stubDisposeProgram(_sessionId: string): void {}
