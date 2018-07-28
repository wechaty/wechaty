#!/usr/bin/env bash
set -e

npm version

if [ "$1" != "dev" ] && ./scripts/development-release.ts; then
  echo "Current release is a development release, please only update the docs when there's a stable release."
  exit 1
else
  echo "Generating docs ..."
  npm run dist
  echo -e '# Wechaty v'$(jq -r .version package.json)' Documentation\n\n* <https://blog.chatie.io>\n\n' > docs/index.md
  jsdoc2md dist/src/wechaty.js dist/src/user/{room,contact,contact-self,friendship,message,room-invitation}.js >> docs/index.md
fi
