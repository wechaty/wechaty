#!/usr/bin/env bash
set -e

PROTO_DIR="./protobuf"

# Directory to write generated code to (.js and .d.ts files)
OUT_DIR="./generated"
[ -d ${OUT_DIR} ] || {
  mkdir ${OUT_DIR}
}

#
#
# 1. Generate Client Stubs
#
#
protoc \
  --proto_path=${PROTO_DIR} \
  \
  --js_out="import_style=commonjs,binary:${OUT_DIR}" \
  \
  --plugin="protoc-gen-ts=`which protoc-gen-ts`" \
  --ts_out="service=true:${OUT_DIR}" \
  \
  ${PROTO_DIR}/*.proto

#
#
# 2. Generate Server Stubs
#
#
protoc \
  --proto_path=${PROTO_DIR} \
  \
  --js_out="import_style=commonjs,binary:${OUT_DIR}" \
  \
  --grpc_out="${OUT_DIR}" \
  --plugin=protoc-gen-grpc=`which grpc_tools_node_protoc_plugin` \
  \
  ${PROTO_DIR}/*.proto

#
#
# 3. Generate Server Stubs Typing Defination
#
#
protoc \
  --proto_path=${PROTO_DIR} \
  \
  --plugin="protoc-gen-ts=`which protoc-gen-ts`" \
  --ts_out="${OUT_DIR}" \
  \
  ${PROTO_DIR}/*.proto
