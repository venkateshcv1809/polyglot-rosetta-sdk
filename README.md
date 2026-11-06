# Prosetta SDK

The JavaScript SDK wrapper for the Polyglot Rosetta project. The SDK will
eventually prepare the assets needed by the WebAssembly runtime. This starter
package currently exposes only `init()`.

## Local development

Install [mise](https://mise.jdx.dev/) and [just](https://just.systems/), then
activate the project tools and install dependencies:

```sh
mise trust
mise install
just install
```

mise enables Corepack when it installs Node 24 and installs the Yarn version
pinned by the `packageManager` field in `package.json`.

Run the available commands with `just` or the matching Yarn scripts:

```sh
just build
just check
just clean
```

## Usage

```js
import { init } from 'prosetta-sdk';

init();
```

The tsdown build produces one UMD bundle at `dist/prosetta-sdk.js` for browser
script loading, CommonJS `require()`, and ES module imports. TypeScript emits
the package declarations alongside the bundle.
