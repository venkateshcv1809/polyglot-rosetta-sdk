import * as ts from 'typescript';

export function transpileTypeScriptFiles(files: Record<string, string>): Record<string, string> {
  const compiled: Record<string, string> = {};

  for (const [path, source] of Object.entries(files)) {
    if (!path.endsWith('.ts')) {
      compiled[path] = source;
      continue;
    }

    const result = ts.transpileModule(source, {
      fileName: path,
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
        strict: false,
      },
      reportDiagnostics: true,
    });

    const error = result.diagnostics?.find((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);

    if (error) {
      throw new Error(ts.flattenDiagnosticMessageText(error.messageText, '\n'));
    }

    compiled[jsPath(path)] = result.outputText;
  }

  return compiled;
}

export function jsPath(path: string): string {
  return path.endsWith('.ts') ? `${path.slice(0, -3)}.js` : path;
}
