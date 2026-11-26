#!/usr/bin/env bash
#
# Packs wechaty-puppet-mock and checks that the tarball works as a consumer
# sees it: installs it in a temporary ESM project together with its
# wechaty-puppet peer (packed from the workspace, as 2.0 is not on npm yet),
# type-checks a smoke test against the published types, and runs it.
#
set -euo pipefail

PACKAGE_DIR=$(pwd)
TMPDIR="/tmp/npm-pack-testing.$$"
mkdir "$TMPDIR"
# generate-package-json.sh rewrites src/package-json.ts; put back exactly what
# was there, including uncommitted edits.
cp src/package-json.ts "$TMPDIR/package-json.ts.orig"
cp package.json "$TMPDIR/package.json.orig"
trap 'cp "$TMPDIR/package-json.ts.orig" "$PACKAGE_DIR/src/package-json.ts"; cp "$TMPDIR/package.json.orig" "$PACKAGE_DIR/package.json"; rm -rf "$TMPDIR"' EXIT

./scripts/generate-package-json.sh
npm run dist
npm pack --pack-destination "$TMPDIR"
npm run dist --workspace wechaty-puppet
npm pack --workspace wechaty-puppet --pack-destination "$TMPDIR"
cp tests/fixtures/smoke-testing.ts "$TMPDIR"

cd "$TMPDIR"
npm init -y > /dev/null
npm pkg set type=module
npm install ./wechaty-puppet-mock-*.tgz ./wechaty-puppet-2*.tgz \
  @types/node \
  @typescript/native@npm:typescript@^7.0.2

npx tsc \
  --types node \
  --target esnext \
  --module nodenext \
  --moduleResolution nodenext \
  --verbatimModuleSyntax \
  --lib esnext,dom \
  --noEmitOnError \
  --noImplicitAny \
  --skipLibCheck \
  smoke-testing.ts

echo
echo "ES Module: pack testing..."
node smoke-testing.js
