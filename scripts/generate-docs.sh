#!/usr/bin/env bash
set -e

npm version

if ./scripts/development-release.ts; then
  echo "Current release is a development release, please only update the docs when there's a stable release."
  exit 1
else
  echo "Generating docs ..."
  npm run dist
  echo '# Wechaty v'$(jq -r .version package.json)' Documentation\n* https://blog.chatie.io\n' > docs/index.md
  jsdoc2md dist/src/{wechaty,room,contact,friend-request,message}.js dist/src/puppet-puppeteer/schema.js >> docs/index.md
fi
