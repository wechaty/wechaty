#!/usr/bin/env bash

set -eo pipefail

GENERATED_DIR="$(pwd)/generated"

VERSION=$(jq -r .version ../package.json)
DEPLOY_DIR="wechaty-php-grpc.$$"

mkdir "$DEPLOY_DIR"
pushd "$DEPLOY_DIR"
# trap "rm -rfv $(pwd)/$DEPLOY_DIR" EXIT

git clone git@github.com:wechaty/php-grpc.git
cd php-grpc
cp -Rav "$GENERATED_DIR"/wechaty .
echo "$VERSION" > VERSION

if [ -z "$(git status --porcelain)" ]; then
  echo
  echo "[Publish] There's no new generated code found"
  echo
  exit 0
fi

git \
  -c "user.name=zhangchunsheng" \
  -c "user.email=zhangchunsheng423@gmail.com" \
  \
  commit \
  -am "Deploy PHP Grpc Module v${VERSION}"

git push
echo
echo '[Publish] New code has been generated and pushed'
echo

git tag v"$VERSION"
git push origin v"$VERSION"
echo
echo "[Publish] New version ${VERSION} has been tagged"
echo

git status
popd
