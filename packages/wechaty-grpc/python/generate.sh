#!/usr/bin/env bash
set -e
shopt -s globstar

#
# Python Import Class With Same Name as Directory
#   https://stackoverflow.com/q/16245106/1123955
#

# Directory to write generated code to (.js and .d.ts files)
OUT_DIR="./src/wechaty_grpc"
[ -d ${OUT_DIR} ] || {
  mkdir -p ${OUT_DIR}
}

function generate_proto_stub () {
  # ./merge-proto.sh > "$OUT_DIR/wechaty_grpc.proto"
  # PROTO_DIR="$OUT_DIR"
  PROTO_DIR=../proto

  PROTOC_CMD="python3 \
    -m grpc_tools.protoc \
    --proto_path=${PROTO_DIR} \
    --proto_path=../third-party \
    --proto_path=/usr/local/include/ \
    wechaty/puppet.proto \
  "

  $PROTOC_CMD \
    --python_betterproto_out=${OUT_DIR}
}

# https://github.com/wechaty/grpc/issues/120
function workaround_issue_120 () {
  sed -i \
    's/from typing import AsyncIterable, AsyncIterator, Iterable, Optional, Union/from typing import AsyncIterable, AsyncIterator, Iterable, Optional, Union, List/' \
    ${OUT_DIR}/wechaty/__init__.py
}

main () {
  generate_proto_stub
  workaround_issue_120
}

main
