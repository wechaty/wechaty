#!/usr/bin/env bash
set -e

# Huan(202110): enable `**/*.proto` to include all files
# https://stackoverflow.com/a/28199633/1123955
shopt -s globstar

#
# Python Import Class With Same Name as Directory
#   https://stackoverflow.com/q/16245106/1123955
#

# https://stackoverflow.com/a/4774063/1123955
WORK_DIR="$( cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 ; pwd -P )"
REPO_DIR="$( cd "$WORK_DIR/../../" >/dev/null 2>&1 ; pwd -P )"

OUT_DIR="$WORK_DIR/src/wechaty_grpc/"
[ -d "$OUT_DIR" ] || mkdir -p $OUT_DIR

function generate_proto_stub () {
  PROTOC_CMD="python3 \
    -m grpc_tools.protoc \
    --proto_path=$REPO_DIR/proto \
    --proto_path=$REPO_DIR/third-party \
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

  # Huan(202110): 2.0.0-beta.3 fixed this
  # workaround_issue_120
}

main
