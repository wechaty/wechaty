#!/usr/bin/env bash

set -e
set -o pipefail

# https://stackoverflow.com/a/4774063/1123955
WORK_DIR="$( cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 ; pwd -P )"
REPO_DIR="$( cd "$WORK_DIR/../" >/dev/null 2>&1 ; pwd -P )"
OUT_DIR="$REPO_DIR/out/"

PACKAGE_JSON_FILE="$REPO_DIR/package.json"
SWAGGER_JSON_FILE="$OUT_DIR/wechaty/puppet.swagger.json"

function check_package_json () {
  if [ ! -f "$PACKAGE_JSON_FILE" ]; then
    echo "$PACKAGE_JSON_FILE not found"
    exit 1
  fi
}

function generate_swagger () {
  if [ ! -e "$OUT_DIR" ]; then
    mkdir "$OUT_DIR"
  fi

  PROTOC="protoc \
    -I $REPO_DIR/proto/ \
    -I $REPO_DIR/third-party/ \
    $REPO_DIR/proto/wechaty/puppet.proto \
  "

  ${PROTOC} \
    --openapiv2_out ${OUT_DIR} \
    --openapiv2_opt logtostderr=true \
    --openapiv2_opt generate_unbound_methods=true
}

function update_version () {
  [ -f "$SWAGGER_JSON_FILE" ] || {
    echo "File not found: $SWAGGER_JSON_FILE"
    exit 1
  }

  grpcVersion=$(jq -r .version ${PACKAGE_JSON_FILE})
  tmpFile="/tmp/openapi.$$"
  cat "$SWAGGER_JSON_FILE" \
    | jq --arg version "$grpcVersion" \
        '.info.version = $version' \
          > "$tmpFile"
  mv "$tmpFile" "$SWAGGER_JSON_FILE"

  echo "Swagger version synced with gRPC version $grpcVersion"
}

function main () {
  check_package_json
  generate_swagger
  update_version
}

main
