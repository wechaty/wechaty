#!/usr/bin/env bash
#
# Packs wechaty-puppet and checks that the tarball works as a consumer sees it:
# installs it in a temporary ESM project, type-checks a smoke test that extends
# the abstract Puppet through every public entry point, and runs it.
#
set -euo pipefail

PACKAGE_DIR=$(pwd)
TMPDIR="/tmp/npm-pack-testing.$$"
mkdir "$TMPDIR"
# generate-package-json.sh rewrites src/package-json.ts; put back exactly what
# was there, including uncommitted edits.
cp src/package-json.ts "$TMPDIR/package-json.ts.orig"
trap 'cp "$TMPDIR/package-json.ts.orig" "$PACKAGE_DIR/src/package-json.ts"; rm -rf "$TMPDIR"' EXIT

./scripts/generate-package-json.sh
npm run dist
npm pack --pack-destination "$TMPDIR"
cp tests/fixtures/smoke-testing.ts "$TMPDIR"

cd "$TMPDIR"
npm init -y > /dev/null
npm pkg set type=module
npm install ./wechaty-puppet-*.tgz \
  @types/node \
  @typescript/native@npm:typescript@^7.0.2

npx tsc \
  --target esnext \
  --module nodenext \
  --moduleResolution nodenext \
  --verbatimModuleSyntax \
  --lib esnext \
  --noEmitOnError \
  --noImplicitAny \
  --skipLibCheck \
  smoke-testing.ts

echo
echo "ES Module: pack testing..."
node smoke-testing.js
