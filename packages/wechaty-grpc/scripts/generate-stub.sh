#!/usr/bin/env bash
set -e
shopt -s globstar

PROTO_DIR="./proto"

# Directory to write generated code to (.js and .d.ts files)
OUT_DIR="./generated"
[ -d ${OUT_DIR} ] || {
  mkdir ${OUT_DIR}
}

PROTOC_CMD="protoc --proto_path=${PROTO_DIR} --proto_path=/usr/local/include/ ${PROTO_DIR}/**/*.proto"

#
# 1. JS for Protocol Buffer
#   - https://github.com/google/protobuf/releases/latest
#
#  Generate: wechaty-puppet_pb.js
$PROTOC_CMD \
  --js_out="import_style=commonjs,binary:${OUT_DIR}"

#
# 2. JS for gRPC Stubs
#   - https://www.npmjs.com/package/grpc-tools
#
# Generate: wechaty-puppet_grpc_pb.js
$PROTOC_CMD \
  --plugin="protoc-gen-grpc=`command -v grpc_tools_node_protoc_plugin`" \
  --grpc_out="${OUT_DIR}"

#
# 3. TS for Protocol Buffer & gRPC Stubs
#   - https://github.com/agreatfool/grpc_tools_node_protoc_ts
#
# Generate:
#   wechaty-puppet_grpc_pb.d.ts
#   wechaty-puppet_pb.d.ts
$PROTOC_CMD \
  --plugin="protoc-gen-grpc=node_modules/grpc_tools_node_protoc_ts/bin/protoc-gen-ts" \
  --grpc_out="${OUT_DIR}"

#
# 4. JS & TS for gRPC Web
#   - https://github.com/improbable-eng/ts-protoc-gen
#
# Generate:
#   wechaty-puppet_pb_service.d.ts
#   wechaty-puppet_pb_service.js
$PROTOC_CMD \
  --plugin="protoc-gen-ts=node_modules/ts-protoc-gen/bin/protoc-gen-ts" \
  --ts_out="service=true:${OUT_DIR}"
