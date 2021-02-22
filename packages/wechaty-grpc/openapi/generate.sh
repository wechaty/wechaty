#!/usr/bin/env bash

set -e
set -o pipefail

# https://stackoverflow.com/a/4774063/1123955
SCRIPTPATH="$( cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 ; pwd -P )"

THIRD_PARTY_DIR="${SCRIPTPATH}/../third-party/"
GENERATED_DIR="${SCRIPTPATH}/../generated/"

PACKAGE_JSON_FILE="${SCRIPTPATH}/../package.json"
SWAGGER_JSON_FILE="${GENERATED_DIR}/wechaty/puppet.swagger.json"

function generate_swagger () {
  PROTOC="protoc \
    -I ../proto/ \
    -I ../proto/wechaty/ \
    -I ${THIRD_PARTY_DIR} \
    ../proto/wechaty/puppet.proto \
  "

  ${PROTOC} \
    --openapiv2_out ${GENERATED_DIR} \
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
  generate_swagger
  update_version
}

main
