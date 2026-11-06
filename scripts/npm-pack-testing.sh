#!/usr/bin/env bash
set -e

VERSION=$(node --input-type=commonjs -p "require('./package.json').version")

if ./node_modules/.bin/semver-is-prod "$VERSION"; then
  NPM_TAG=latest
else
  NPM_TAG=next
fi

npm run dist
npm pack

TMPDIR="/tmp/npm-pack-testing.$$"
mkdir "$TMPDIR"
trap 'rm -rf "$TMPDIR"' EXIT

mv ./*-*.*.*.tgz "$TMPDIR"
cp tests/fixtures/smoke-testing.ts "$TMPDIR"

cd $TMPDIR

npm init -y
npm install --production ./*-*.*.*.tgz \
  @types/node \
  @typescript/native@npm:typescript@^7.0.2 \
  file-box@"$NPM_TAG" \
  wechaty-puppet-mock@"$NPM_TAG" \
  wechaty-puppet-padlocal@"$NPM_TAG" \
  wechaty-puppet-service@"$NPM_TAG" \

#
# ES Modules
#
node --input-type=commonjs -e "const fs = require('node:fs'); const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8')); packageJson.type = 'module'; fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2))"

npx tsc \
  --target esnext \
  --module nodenext \
  \
  --moduleResolution nodenext \
  --esModuleInterop \
  --lib esnext \
  --noEmitOnError \
  --noImplicitAny \
  --skipLibCheck \
  smoke-testing.ts

echo
echo "ES Module: pack testing..."
node smoke-testing.js
