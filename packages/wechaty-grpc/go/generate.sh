#!/usr/bin/env bash

set -eo pipefail

PROTO_BASE_DIR=../proto
PROTO_PUPPET_DIR=$PROTO_BASE_DIR/wechaty/puppet
PROTO_WECHATY_DIR=$PROTO_BASE_DIR/wechaty

OUT_WECHATY_DIR=./generated/wechaty
OUT_PUPPET_DIR=$OUT_WECHATY_DIR/puppet

if [ ! -d "$PUPPET_GEN_DIR" ]; then
  mkdir -p $OUT_PUPPET_DIR
fi

protoc --version

protoc \
  -I $PROTO_PUPPET_DIR \
  --go_out=plugins=grpc:$OUT_PUPPET_DIR \
  --go_opt=paths=source_relative \
  $PROTO_PUPPET_DIR/*.proto

protoc \
  -I $PROTO_WECHATY_DIR \
  -I $PROTO_PUPPET_DIR \
  --go_out=plugins=grpc:$OUT_WECHATY_DIR \
  --go_opt=paths=source_relative \
  $PROTO_WECHATY_DIR/*.proto
