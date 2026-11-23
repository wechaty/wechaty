#!/usr/bin/env bash

set -eo pipefail

# Huan(202110): enable `**/*.proto` to include all files
# https://stackoverflow.com/a/28199633/1123955
shopt -s globstar

# https://stackoverflow.com/a/4774063/1123955
WORK_DIR="$( cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 ; pwd -P )"
REPO_DIR="$( cd "$WORK_DIR/../../" >/dev/null 2>&1 ; pwd -P )"

OUT_DIR="$WORK_DIR/src/main/java/"
[ -d "$OUT_DIR" ] || mkdir -p $OUT_DIR


protoc --version

protoc \
  -I $REPO_DIR/proto \
  -I $REPO_DIR/third-party \
  --plugin=protoc-gen-grpc-java=/usr/local/bin/protoc-gen-grpc-java-1.37.1-linux-x86_64.exe \
  --java_out=$OUT_DIR \
  --grpc-java_out=$OUT_DIR \
  $REPO_DIR/proto/**/*.proto
