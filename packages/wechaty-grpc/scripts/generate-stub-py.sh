#!/usr/bin/env bash
set -e
shopt -s globstar

#
# Python Import Class With Same Name as Directory
#   https://stackoverflow.com/q/16245106/1123955
#

# Directory to write generated code to (.js and .d.ts files)
OUT_DIR="./chatie_grpc"
[ -d ${OUT_DIR} ] || {
  mkdir ${OUT_DIR}
}

./scripts/merge-proto.sh > "$OUT_DIR/chatie_grpc.proto"
PROTO_DIR="$OUT_DIR"

PROTOC_CMD="python3 -m grpc_tools.protoc --proto_path=${PROTO_DIR} --proto_path=/usr/local/include/ ${PROTO_DIR}/**/*.proto"

$PROTOC_CMD \
  --python_betterproto_out=${OUT_DIR}
