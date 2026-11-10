set dotenv-load

default:
  @just --list

install:
  yarn install

build:
  yarn build:dev

build-prod:
  yarn build:prod

check:
  yarn check

clean:
  yarn clean

dev:
  yarn install --immutable
  yarn build
