# Prosetta SDK

The JavaScript SDK wrapper for the Polyglot Rosetta project. The SDK will
eventually prepare the assets needed by the WebAssembly runtime. The current
starter exposes `init()` and `shutdown()` for the WASM module lifecycle.

## Local development

Install [mise](https://mise.jdx.dev/) and [just](https://just.systems/), then
activate the project tools and install dependencies:

```sh
mise trust
mise install
cp .env.example .env
just install
```

mise installs Node 24 and enables Corepack. Corepack selects the Yarn version
pinned by the `packageManager` field in `package.json`.

mise loads `PROSETTA_WASM_PATH` from `.env`. Set it to a local directory that
contains `prosetta.wasm`, or to the HTTP(S) core release root or versioned
release directory. For local
development, use `../polyglot-rosetta/dist`; the core build writes the WASM file
and its matching Go runtime loader there. For production, the SDK appends the
core version pinned in `src/config/constants.ts` to the release root.

Run the development build with `just build` or `yarn build:dev`. It places the
ESM and CommonJS npm outputs with declarations under `dist/npm/`, plus the
standalone browser bundle and its source map in `dist/`.

Run the production build with `just build-prod` or `yarn build:prod`. It places
the standalone browser bundle and a production npm archive in `dist/`. The npm
archive includes the ESM, CommonJS, and TypeScript declaration outputs for
package consumers.

Other available commands:

```sh
just check
just clean
```

## Usage

```js
import { init, shutdown } from '@venkateshcv1809/prosetta-sdk';

const wasmModule = await init();
// Use the compiled module here.
shutdown();
```

`init()` reads `prosetta.wasm` from the configured directory and returns a
`Promise<WebAssembly.Module>`. For remote release assets, it checks the cache,
then downloads `SHA256SUMS` and compares its published `prosetta.wasm` checksum
against any cached bytes. It downloads and caches the WASM only when the
checksum differs or no cached copy exists, and verifies downloaded bytes before
using them. The
browser build uses the Cache API when available; Node.js stores downloads in the
user cache directory (`$XDG_CACHE_HOME/prosetta-sdk/assets`,
`~/Library/Caches/prosetta-sdk/assets`, or `%LOCALAPPDATA%/prosetta-sdk/assets`). If
`SHA256SUMS` is unavailable, as in development builds, the SDK downloads the
WASM directly without persistent caching. Local directory paths are read
directly.
`shutdown()` clears the in-memory compiled module but keeps the persistent
download cache. The browser Cache API requires a secure context and may be
unavailable or evicted by the browser; in that case the SDK verifies and uses
the downloaded WASM without persistent caching.

The tsdown build produces an ESM and CommonJS npm package under `dist/npm/`, plus
a standalone browser IIFE at `dist/prosetta-sdk.js`. The browser global is
`ProsettaSDK`. The browser bundle embeds `PROSETTA_WASM_PATH` from the build
environment. Locally, mise reads it from `.env`; CI reads the repository Actions
variable. The npm package reads the environment variable at runtime.

## Publishing

Pushes to `develop` run `.github/workflows/build.yml`, which builds the production
bundle and npm archive as workflow artifacts only. Publishing a GitHub Release
runs `.github/workflows/release.yml`. Its tag must match the version in
`package.json` (for example, `v0.2.0`) and point to a commit in `main`'s
history. The release workflow attaches the bundle and npm archive to the
release, then publishes the package to npm and GitHub Packages.

Set the repository Actions variable `PROSETTA_WASM_PATH` to the core release
root: `https://github.com/venkateshcv1809/polyglot-rosetta/releases/download/`.
The SDK appends `v0.9.1/` (from `PROSETTA_WASM_VERSION` in
`src/config/constants.ts`), producing the versioned release directory
`https://github.com/venkateshcv1809/polyglot-rosetta/releases/download/v0.9.1/`.
You can also set the variable directly to that versioned directory; if its
version differs from the SDK constant, loading fails with a clear error.

Add an `NPM_TOKEN` repository secret with permission to publish this package.
GitHub Packages uses the workflow's `GITHUB_TOKEN`. After its first publish,
make the GitHub package public in the package settings. GitHub Packages
consumers also need npm registry configuration and a token to install it.
