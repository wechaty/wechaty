#!/usr/bin/env bash
set -e

VERSION=$(node --input-type=commonjs -p "require('./package.json').version")

if ./node_modules/.bin/semver-is-prod "$VERSION"; then
  NPM_DIST_TAG=latest
else
  NPM_DIST_TAG=next
fi

TMPDIR="/tmp/npm-pack-testing.$$"
mkdir "$TMPDIR"
trap 'rm -rf "$TMPDIR"' EXIT

npm run dist
npm pack --pack-destination "$TMPDIR"
shopt -s nullglob
PACK_FILES=("$TMPDIR"/*.tgz)
if [ "${#PACK_FILES[@]}" -ne 1 ]; then
  echo "Expected exactly one package tarball, found ${#PACK_FILES[@]}." >&2
  exit 1
fi
PACK_FILE="${PACK_FILES[0]##*/}"
cp tests/fixtures/smoke-testing.ts "$TMPDIR"

cd "$TMPDIR"

npm init -y
npm install --production "./$PACK_FILE" \
  @types/node \
  @typescript/native@npm:typescript@^7.0.2 \
  file-box@"$NPM_DIST_TAG" \
  wechaty-puppet-mock@"$NPM_DIST_TAG" \
  wechaty-puppet-padlocal@"$NPM_DIST_TAG" \
  wechaty-puppet-service@"$NPM_DIST_TAG" \

#
# ES Modules
#
node --input-type=commonjs -e "const fs = require('node:fs'); const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8')); packageJson.type = 'module'; fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2))"

npx tsc \
  --target esnext \
  --module nodenext \
  \
  --moduleResolution nodenext \
  --verbatimModuleSyntax \
  --esModuleInterop \
  --lib esnext \
  --noEmitOnError \
  --noImplicitAny \
  --skipLibCheck \
  smoke-testing.ts

echo
echo "ES Module: pack testing..."
node smoke-testing.js

if [ -n "${TESTED_PACKAGE_OUTPUT_PATH:-}" ]; then
  cp "$PACK_FILE" "$TESTED_PACKAGE_OUTPUT_PATH"
fi
