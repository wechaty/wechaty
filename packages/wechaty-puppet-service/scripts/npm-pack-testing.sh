#!/usr/bin/env bash
set -e

VERSION=$(npx pkg-jq -r .version)

if npx --package @chatie/semver semver-is-prod "$VERSION"; then
  NPM_TAG=latest
else
  NPM_TAG=next
fi

npm run dist
npm pack

TMPDIR="/tmp/npm-pack-testing.$$"
mkdir "$TMPDIR"
mv ./*-*.*.*.tgz "$TMPDIR"
cp tests/fixtures/smoke-testing.ts "$TMPDIR"

cd $TMPDIR

npm init -y
npm install --production *-*.*.*.tgz \
  @types/node \
  @chatie/tsconfig@$NPM_TAG \
  "wechaty-puppet@$NPM_TAG" \
  "wechaty@$NPM_TAG" \

#
# CommonJS
#
./node_modules/.bin/tsc \
  --target es6 \
  --module CommonJS \
  \
  --moduleResolution node \
  --esModuleInterop \
  --lib esnext \
  --noEmitOnError \
  --noImplicitAny \
  --skipLibCheck \
  smoke-testing.ts

echo
echo "CommonJS: pack testing..."
node smoke-testing.js

#
# ES Modules
#

# https://stackoverflow.com/a/59203952/1123955
echo "`jq '.type="module"' package.json`" > package.json

./node_modules/.bin/tsc \
  --target es2020 \
  --module es2020 \
  \
  --moduleResolution node \
  --esModuleInterop \
  --lib esnext \
  --noEmitOnError \
  --noImplicitAny \
  --skipLibCheck \
  smoke-testing.ts

echo
echo "ES Module: pack testing..."
node smoke-testing.js
