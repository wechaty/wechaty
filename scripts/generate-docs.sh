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

DOCS_INDEX_MD=docs/index.md

cat <<_EOF_ > "$DOCS_INDEX_MD"
# Wechaty v$(jq -r .version package.json) Documentation

- Website - <https://wechaty.js.org>
- Docs Site - <https://wechaty.js.org/docs/>
- API References - <https://wechaty.github.io/wechaty/>

_EOF_

jsdoc2md \
  dist/src/wechaty.js \
  dist/src/user/{room,contact,contact-self,friendship,message,room-invitation}.js \
  >> "$DOCS_INDEX_MD"

#
# https://sidecar.gitter.im/
#
cat <<_EOF_ >> "$DOCS_INDEX_MD"
<script>
  ((window.gitter = {}).chat = {}).options = {
    room: 'chatie/wechaty'
  };
</script>
<script src="https://sidecar.gitter.im/dist/sidecar.v1.js" async defer></script>
_EOF_
