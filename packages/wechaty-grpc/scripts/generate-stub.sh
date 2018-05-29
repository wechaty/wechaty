#!/usr/bin/env bash
set -e

# Directory to write generated code to (.js and .d.ts files)
OUT_DIR="./generated"

./node_modules/.bin/grpc_tools_node_protoc \
    --plugin=protoc-gen-ts='./node_modules/.bin/protoc-gen-ts' \
    --js_out="import_style=commonjs,binary:${OUT_DIR}" \
    --ts_out="service=true:${OUT_DIR}" \
    examples/books.proto
