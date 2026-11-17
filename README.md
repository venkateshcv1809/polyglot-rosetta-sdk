# Prosetta SDK

JavaScript SDK for the Polyglot Rosetta WebAssembly runtime.

## Setup

Install [mise](https://mise.jdx.dev/) and [just](https://just.systems/), then:

```sh
mise trust
mise install
cp .env.example .env
just install
```

Set `PROSETTA_WASM_PATH` and `PROSETTA_CATALOG_URL` in `.env`.

```sh
just build
just check
just clean
```

## Usage

```js
import { init, shutdown } from '@venkateshcv1809/prosetta-sdk';

const { wasm, catalog } = await init();
shutdown();
```
