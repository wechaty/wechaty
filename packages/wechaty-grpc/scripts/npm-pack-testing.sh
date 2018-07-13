#!/usr/bin/env bash
set -e

npm run dist
npm run pack

TMPDIR="/tmp/npm-pack-testing.$$"
mkdir "$TMPDIR"
mv *-*.*.*.tgz "$TMPDIR"
cp tests/fixtures/smoke-testing.ts "$TMPDIR"

cd $TMPDIR
npm init -y
npm install *-*.*.*.tgz \
  @types/node \
  google-protobuf \
  typescript \

./node_modules/.bin/tsc \
  --lib esnext \
  --noEmitOnError \
  smoke-testing.ts

node smoke-testing.js
