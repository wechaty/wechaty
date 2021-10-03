#!/usr/bin/env bash

set -eo pipefail

OUT_DIR="$(pwd)/out"

TEST_DIR="wechaty-go-grpc-test.$$"

mkdir "$TEST_DIR"
pushd "$TEST_DIR"

git clone https://github.com/wechaty/go-grpc.git
cd go-grpc
cp -Rav "$OUT_DIR"/wechaty .

# build test
go get ./...
go build -v wechaty/puppet.pb.go
