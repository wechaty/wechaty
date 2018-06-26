#!/usr/bin/env bash
set -e

PROTO_DIR="./protobuf"

# Directory to write generated code to (.js and .d.ts files)
OUT_DIR="./generated"

# grpc_tools_node_protoc \
#   --plugin=protoc-gen-ts='./node_modules/.bin/protoc-gen-ts' \
#   --js_out="import_style=commonjs,binary:${OUT_DIR}" \
#   --ts_out="service=true:${OUT_DIR}" \
#   examples/books.proto

protoc \
  --proto_path=${PROTO_DIR} \
  \
  --js_out="import_style=commonjs,binary:${OUT_DIR}" \
  \
  --plugin="protoc-gen-ts=`which protoc-gen-ts`" \
  --ts_out="service=true:${OUT_DIR}" \
  \
  ${PROTO_DIR}/wechaty-puppet.proto

# --ts_out=service=true:./codegen/ts
# --grpc_out=./codegen/ts

# helloworld/helloworld.proto

protoc \
  --proto_path=${PROTO_DIR} \
  \
  --js_out="import_style=commonjs,binary:${OUT_DIR}" \
  \
  --grpc_out="${OUT_DIR}" \
  --plugin=protoc-gen-grpc=`which grpc_tools_node_protoc_plugin` \
  \
  ${PROTO_DIR}/wechaty-puppet.proto

protoc \
  --proto_path=${PROTO_DIR} \
  \
  --plugin="protoc-gen-ts=`which protoc-gen-ts`" \
  --ts_out="${OUT_DIR}" \
  \
  ${PROTO_DIR}/wechaty-puppet.proto
