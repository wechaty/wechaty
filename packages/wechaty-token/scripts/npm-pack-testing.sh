#!/usr/bin/env bash
set -e

npm run dist
npm pack

TMPDIR="/tmp/npm-pack-testing.$$"
mkdir "$TMPDIR"
mv ./*-*.*.*.tgz "$TMPDIR"
cp tests/fixtures/smoke-testing.ts "$TMPDIR"

cd $TMPDIR

npm init -y
npm install ./*-*.*.*.tgz \
  @chatie/tsconfig \
  @grpc/grpc-js \

#
# CommonJS
#
./node_modules/.bin/tsc \
  --esModuleInterop \
  --lib esnext \
  --noEmitOnError \
  --noImplicitAny \
  --skipLibCheck \
  --target es5 \
  --module CommonJS \
  --moduleResolution node \
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
  --esModuleInterop \
  --lib esnext \
  --noEmitOnError \
  --noImplicitAny \
  --skipLibCheck \
  --target es2020 \
  --module es2020 \
  --moduleResolution node \
  smoke-testing.ts

echo
echo "ES Module: pack testing..."
node smoke-testing.js
