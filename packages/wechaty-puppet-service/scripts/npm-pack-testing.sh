#!/usr/bin/env bash
#
# Packs wechaty-puppet-service and checks that the tarball works as a consumer
# sees it: installs it in a temporary ESM project together with the workspace
# packages it needs (wechaty-puppet, wechaty-grpc, wechaty-token, and
# wechaty-puppet-mock for the smoke test), packed from the workspace as 2.0 is
# not on npm yet. Then it type-checks a smoke test against the published types
# and runs a gRPC round trip between the packed client and server.
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
for workspace in wechaty-puppet wechaty-grpc wechaty-token wechaty-puppet-mock; do
  npm run dist --workspace "$workspace"
  npm pack --workspace "$workspace" --pack-destination "$TMPDIR"
done
cp tests/fixtures/smoke-testing.ts "$TMPDIR"

cd "$TMPDIR"
npm init -y > /dev/null
npm pkg set type=module
npm install ./wechaty-*.tgz \
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
