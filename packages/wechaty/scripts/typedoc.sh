#!/usr/bin/env bash
set -e

typedoc \
  --exclude \"src/**/*.test.ts\" \
  --excludeExternals \
  --excludePrivate \
  --excludeProtected \
  --externalPattern ./**/lib/** \
  --mode modules \
  --module nodenext \
  --target ES6 \
  --name "Wechaty Documentation" \
  --out dist/docs/ \
  src/
