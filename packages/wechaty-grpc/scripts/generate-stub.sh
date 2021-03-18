#!/usr/bin/env bash
set -e

PROTO_DIR="./proto/"
THIRD_PARTY_DIR="./third-party/"

# Directory to write generated code to (.js and .d.ts files)
OUT_DIR="./generated"
[ -d ${OUT_DIR} ] || {
  mkdir -p ${OUT_DIR}
}

PROTO_FILE_LIST=$(find $PROTO_DIR $THIRD_PARTY_DIR -type f -name *.proto)

# --proto_path=/usr/local/include/
PROTOC_CMD="protoc \
  -I ${THIRD_PARTY_DIR} \
  -I ${PROTO_DIR} \
  $PROTO_FILE_LIST \
"

function gen_js_pb () {
  #
  # 1. JS for Protocol Buffer
  #   - https://github.com/google/protobuf/releases/latest
  #
  #  Generate: wechaty-puppet_pb.js
  $PROTOC_CMD \
    --js_out="import_style=commonjs,binary:${OUT_DIR}"
}

function gen_js_stub () {
  #
  # 2. JS for gRPC Stubs
  #   - https://www.npmjs.com/package/grpc-tools
  #
  # Generate: wechaty-puppet_grpc_pb.js
  $PROTOC_CMD \
    --plugin="protoc-gen-grpc=node_modules/.bin/grpc_tools_node_protoc_plugin" \
    --grpc_out="grpc_js:${OUT_DIR}"
}

function gen_ts_typing () {
  #
  # 3. TS for Protocol Buffer & gRPC Stubs
  #   - https://github.com/agreatfool/grpc_tools_node_protoc_ts
  #
  # Generate:
  #   wechaty-puppet_grpc_pb.d.ts
  #   wechaty-puppet_pb.d.ts
  $PROTOC_CMD \
    --plugin="protoc-gen-grpc=node_modules/grpc_tools_node_protoc_ts/bin/protoc-gen-ts" \
    --grpc_out="grpc_js:${OUT_DIR}"
}

function gen_web_grpc () {
  #
  # 4. JS & TS for gRPC Web
  #   - https://github.com/improbable-eng/ts-protoc-gen
  #
  # Generate:
  #   wechaty-puppet_pb_service.d.ts
  #   wechaty-puppet_pb_service.js
  $PROTOC_CMD \
    --plugin="protoc-gen-ts=node_modules/ts-protoc-gen/bin/protoc-gen-ts" \
    --ts_out="service=grpc-web:${OUT_DIR}"
}
function gen_openapi () {
  pushd openapi
  make generate
  popd
}

function main () {
  gen_js_pb
  gen_js_stub
  gen_ts_typing

  gen_web_grpc

  gen_openapi
}

main
