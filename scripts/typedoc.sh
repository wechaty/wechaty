#!/usr/bin/env bash
set -e

typedoc \
  --exclude \"src/*.spec.ts\" \
  --excludeExternals \
  --excludePrivate \
  --excludeProtected \
  --externalPattern ./**/lib/** \
  --mode modules \
  --module commonjs \
  --target ES6 \
  --name "Wechaty Documentation" \
  --out dist/docs/ \
  src/
