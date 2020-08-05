#!/usr/bin/env bash

set -eo pipefail

PROTO_BASE_DIR=../proto
PROTO_PUPPET_DIR=$PROTO_BASE_DIR/wechaty/puppet
PROTO_WECHATY_DIR=$PROTO_BASE_DIR/wechaty

# /usr/local/include

OUT_WECHATY_DIR=./generated/wechaty
OUT_PUPPET_DIR=$OUT_WECHATY_DIR

if [ ! -d "$PUPPET_GEN_DIR" ]; then
  mkdir -p $OUT_PUPPET_DIR
fi

protoc --version

protoc \
  -I $PROTO_PUPPET_DIR \
  --php_out=$OUT_PUPPET_DIR \
  --grpc_out=$OUT_PUPPET_DIR \
  --plugin=protoc-gen-grpc=/usr/local/bin/grpc_php_plugin \
  $PROTO_PUPPET_DIR/*.proto

protoc \
  -I $PROTO_WECHATY_DIR \
  -I $PROTO_PUPPET_DIR \
  --php_out=$OUT_WECHATY_DIR \
  --grpc_out=$OUT_WECHATY_DIR \
  --plugin=protoc-gen-grpc=/usr/local/bin/grpc_php_plugin \
  $PROTO_WECHATY_DIR/*.proto
