#!/usr/bin/env bash
set -e

# http://google.github.io/proto-lens/installing-protoc.html

if [ $(uname) = 'Linux' ]; then
  PROTOC_PLATFORM=linux
else
  PROTOC_PLATFORM=osx
fi

PROTOC_VERSION='3.11.3'
PROTOC_ZIP="protoc-$PROTOC_VERSION-$PROTOC_PLATFORM-x86_64.zip"

curl -OL "https://github.com/google/protobuf/releases/download/v$PROTOC_VERSION/$PROTOC_ZIP"
sudo unzip -o $PROTOC_ZIP -d /usr/local bin/protoc
rm -f $PROTOC_ZIP

# https://github.com/ckaznocha/protoc-gen-lint
go get github.com/ckaznocha/protoc-gen-lint
