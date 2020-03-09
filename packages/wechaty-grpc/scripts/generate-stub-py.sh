#!/usr/bin/env bash
set -e
shopt -s globstar

#
# Python Import Class With Same Name as Directory
#   https://stackoverflow.com/q/16245106/1123955
#
PROTO_DIR="./proto"

# Directory to write generated code to (.js and .d.ts files)
OUT_DIR="./gen_py"
[ -d ${OUT_DIR} ] || {
  mkdir ${OUT_DIR}
}

PROTOC_CMD="protoc --proto_path=${PROTO_DIR} --proto_path=/usr/local/include/ ${PROTO_DIR}/**/*.proto"
$PROTOC_CMD \
  --python_betterproto_out=${OUT_DIR}
