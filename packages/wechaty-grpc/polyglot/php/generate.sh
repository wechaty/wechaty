#!/usr/bin/env bash

set -eo pipefail

# Huan(202110): enable `**/*.proto` to include all files
# https://stackoverflow.com/a/28199633/1123955
shopt -s globstar

# https://stackoverflow.com/a/4774063/1123955
WORK_DIR="$( cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 ; pwd -P )"
REPO_DIR="$( cd "$WORK_DIR/../../" >/dev/null 2>&1 ; pwd -P )"

OUT_DIR="$WORK_DIR/out/wechaty/"
[ -d "$OUT_DIR" ] || mkdir -p $OUT_DIR

protoc --version

protoc \
  -I $REPO_DIR/proto \
  -I $REPO_DIR/third-party \
  --php_out=$OUT_DIR \
  --grpc_out=$OUT_DIR \
  --plugin=protoc-gen-grpc=/usr/local/bin/grpc_php_plugin \
  $REPO_DIR/proto/**/*.proto
