#!/usr/bin/env bash
set -e

typedoc \
  --exclude "src/**/*.spec.ts" \
  --excludeExternals \
  --excludeNotExported \
  --excludePrivate \
  --excludeProtected \
  --mode file \
  --module commonjs \
  --name "Wechaty Puppet v`jq -r .version package.json` Interface" \
  --out dist/docs/ \
  --target ES6 \
  src/
