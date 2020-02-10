#!/usr/bin/env bash
set -e

VERSION=$(npx pkg-jq -r .version)
echo "Version $VERSION"

if ! npx --package @chatie/semver semver-is-prod "$VERSION"; then
  echo "Current release is a development release, please only update the docs when there's a stable release."

  if [ "$1" != "-f" ]; then
    echo "Or use -f to force generating."
    exit 1
  else
    echo "-f found. Forcing generating ..."
  fi
fi

echo "Generating docs ..."
npm run dist
echo -e '# Wechaty v'"$(jq -r .version package.json)"' Documentation\n\n- Blog - <https://blog.chatie.io>\n- Docs - <https://github.com/wechaty/wechaty/blob/master/docs/index.md>\n\n' > docs/index.md
jsdoc2md dist/src/wechaty.js dist/src/user/{room,contact,contact-self,friendship,message,room-invitation}.js >> docs/index.md
