#!/usr/bin/env bash
set -e

rm -fr node_modules/typedoc/node_modules/typescript

VERSION=$(jq -r .version package.json)

typedoc \
  --exclude "src/**/*.spec.ts" \
  --excludeExternals \
  --externalPattern "**/node_modules/**" \
  --excludeNotExported \
  --excludePrivate \
  --excludeProtected \
  --mode file \
  --module commonjs \
  --name "Wechaty Puppet v${VERSION:-0.0.0} Interface" \
  --out docs/typedoc \
  --readme none \
  --target esnext \
  --theme markdown \
  src/
