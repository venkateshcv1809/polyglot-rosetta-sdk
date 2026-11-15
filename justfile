set dotenv-load

default:
  @just --list

install:
  yarn install

install-ci:
  yarn install --immutable

build:
  yarn build:dev

build-prod:
  yarn build:prod

check:
  yarn check

clean:
  yarn clean

verify-package:
  node -e 'const fs = require("node:fs"); const files = fs.readdirSync("dist").filter((file) => file.endsWith(".tgz")); if (files.length !== 1) throw new Error("Expected one npm archive in dist/, found " + files.length)'

dev:
  yarn install --immutable
  yarn build
