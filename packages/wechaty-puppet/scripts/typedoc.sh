#!/usr/bin/env bash
set -e

typedoc \
  --exclude \"src/**/*.spec.ts\" \
  --excludeExternals \
  --excludeNotExported \
  --excludePrivate \
  --excludeProtected \
  --externalPattern **/lib/** \
  --mode file \
  --module commonjs \
  --target ES6 \
  --name "Wechaty Puppet v`jq -r .version package.json` Interface" \
  --out dist/docs/ \
  src/
