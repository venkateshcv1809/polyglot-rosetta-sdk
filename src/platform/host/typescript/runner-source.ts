export function caseRunnerSource(
  files: Record<string, string>,
  entry: string,
  args: string[],
  maxOutputBytes: number,
): string {
  return `(() => {
    const files = ${JSON.stringify(files)};
    const entry = ${JSON.stringify(entry)};
    const args = ${JSON.stringify(args)};
    const maxOutputBytes = ${JSON.stringify(maxOutputBytes)};
    const streams = { stdout: '', stderr: '' };

    function append(stream, chunk) {
      streams[stream] += String(chunk);
    }

    function trim(text) {
      if (text.length <= maxOutputBytes) {
        return { text: text, truncated: false };
      }
      return { text: text.slice(text.length - maxOutputBytes), truncated: true };
    }

    const moduleCache = Object.create(null);

    function requireModule(spec) {
      const resolved = resolve(spec);
      if (!resolved) {
        throw new Error('Cannot find module ' + spec);
      }
      if (moduleCache[resolved]) {
        return moduleCache[resolved].exports;
      }
      const module = { exports: {} };
      moduleCache[resolved] = module;
      const fn = new Function('require', 'module', 'exports', 'process', 'console', 'TextEncoder', files[resolved]);
      fn(requireModule, module, module.exports, process, console, globalThis.TextEncoder);
      return module.exports;
    }

    function resolve(spec) {
      const trimmed = String(spec).replace(/^\\.\\//, '');
      const candidates = [trimmed, trimmed + '.js'];
      return candidates.find(function (name) {
        return Object.prototype.hasOwnProperty.call(files, name);
      });
    }

    const process = {
      argv: ['node', entry].concat(args),
      hrtime: {
        bigint: function () {
          return BigInt(Math.round(performance.now() * 1e6));
        },
      },
      exit: function (code) {
        const error = new Error('exit');
        error.exitCode = code === undefined ? 0 : code;
        throw error;
      },
    };

    const console = {
      log: function () { append('stdout', Array.prototype.join.call(arguments, ' ') + '\\n'); },
      error: function () { append('stderr', Array.prototype.join.call(arguments, ' ') + '\\n'); },
      warn: function () { append('stderr', Array.prototype.join.call(arguments, ' ') + '\\n'); },
      info: function () { append('stdout', Array.prototype.join.call(arguments, ' ') + '\\n'); },
    };

    var exitCode = 0;
    var error;
    try {
      requireModule('./' + entry);
    } catch (caught) {
      if (caught && typeof caught.exitCode === 'number') {
        exitCode = caught.exitCode;
      } else {
        exitCode = 1;
        error = caught instanceof Error ? caught.message : String(caught);
        append('stderr', (error || 'case failed') + '\\n');
      }
    }

    const stdout = trim(streams.stdout);
    const stderr = trim(streams.stderr);
    return {
      stdout: stdout.text,
      stderr: stderr.text,
      stdout_truncated: stdout.truncated,
      stderr_truncated: stderr.truncated,
      exit_code: exitCode,
      error: error
    };
  })();`;
}
