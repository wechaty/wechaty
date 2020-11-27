#!/usr/bin/env bash

set -eo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

PROTO_BASE_DIR=$ROOT/proto
PROTO_PUPPET_DIR=$PROTO_BASE_DIR/wechaty/puppet
PROTO_WECHATY_DIR=$PROTO_BASE_DIR/wechaty

OUT_WECHATY_DIR=$ROOT/go/generated/wechaty
OUT_PUPPET_DIR=$OUT_WECHATY_DIR

if [ ! -d "$PUPPET_GEN_DIR" ]; then
  mkdir -p $OUT_PUPPET_DIR
fi

protoc --version

cd $PROTO_WECHATY_DIR && protoc \
  -I $PROTO_WECHATY_DIR \
  --go_out=plugins=grpc:$OUT_PUPPET_DIR \
  --go_opt=paths=source_relative \
  puppet/*.proto

protoc \
  -I $PROTO_WECHATY_DIR \
  -I $PROTO_PUPPET_DIR \
  --go_out=plugins=grpc:$OUT_WECHATY_DIR \
  --go_opt=paths=source_relative \
  $PROTO_WECHATY_DIR/*.proto
