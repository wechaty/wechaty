#!/usr/bin/env bash

set -eo pipefail

GENERATED_DIR="$(pwd)/generated"

VERSION=$(jq -r .version ../package.json)
DEPLOY_DIR="wechaty-go-grpc.$$"

mkdir "$DEPLOY_DIR"
# trap "rm -rfv $(pwd)/$DEPLOY_DIR" EXIT

pushd "$DEPLOY_DIR"

git clone git@github.com:wechaty/go-grpc.git
cd go-grpc
cp -Rav "$GENERATED_DIR"/wechaty .
echo "$VERSION" > VERSION

if [ -z "$(git status --porcelain)" ]; then
  echo
  echo 'Working directory clean'
  echo
else
  git commit -am "Deploy Go Grpc Module v${VERSION}"
  git push
  git status
fi

popd
