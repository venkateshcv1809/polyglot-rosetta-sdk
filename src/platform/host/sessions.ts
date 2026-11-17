import { type Program } from './types';

export type PreparedSession = {
  language: string;
  entry: string;
  files: Record<string, string>;
};

const sessions = new Map<string, PreparedSession>();

export function saveSession(program: Program, files: Record<string, string>, entry: string): void {
  sessions.set(program.session_id, {
    language: program.language,
    entry,
    files,
  });
}

export function getSession(sessionId: string): PreparedSession | undefined {
  return sessions.get(sessionId);
}

export function disposeSession(sessionId: string): void {
  sessions.delete(sessionId);
}
