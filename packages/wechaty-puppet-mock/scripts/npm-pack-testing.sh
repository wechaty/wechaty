#!/usr/bin/env bash
set -e

NPM_TAG=latest
if [ ./development-release.ts ]; then
  NPM_TAG=next
fi

npm run dist
npm run pack

TMPDIR="/tmp/npm-pack-testing.$$"
mkdir "$TMPDIR"
mv *-*.*.*.tgz "$TMPDIR"
cp tests/fixtures/smoke-testing.ts "$TMPDIR"

cd $TMPDIR
npm init -y
npm install *-*.*.*.tgz \
  @types/quick-lru \
  @types/node \
  @types/normalize-package-data \
  typescript \
  \
  file-box \
  memory-card \
  "wechaty-puppet@$NPM_TAG" \

./node_modules/.bin/tsc \
  --esModuleInterop \
  --lib esnext \
  --noEmitOnError \
  --noImplicitAny \
  --target es6 \
  --module commonjs \
  smoke-testing.ts

node smoke-testing.js
