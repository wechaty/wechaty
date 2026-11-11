#!/usr/bin/env bash
set -euo pipefail

npm run dist

typedoc \
  --tsconfig scripts/tsconfig.docs.json \
  --entryPoints \
    dist/esm/src/mods/mod.d.ts \
    dist/esm/src/mods/users.d.ts \
    dist/esm/src/mods/impls.d.ts \
  --entryPointStrategy resolve \
  --excludeExternals \
  --excludeInternal \
  --excludePrivate \
  --excludeProtected \
  --cleanOutputDir \
  --out dist/docs \
  --name "Wechaty API" \
  --readme none

test -s dist/docs/classes/mod.WechatyBuilder.html
test -s dist/docs/types/mod.WechatyEventName.html
test -s dist/docs/types/mod.Contact.html
test -s dist/docs/types/mod.Room.html
