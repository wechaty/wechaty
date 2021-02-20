#!/usr/bin/env bash
set -e
set -o pipefail

# https://stackoverflow.com/a/4774063/1123955
SCRIPTPATH="$( cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 ; pwd -P )"

THIRD_PARTY_DIR="${SCRIPTPATH}/../third-party/"

function install_protoc () {
  if command -v protoc > /dev/null; then
    echo "install skipped: protoc exists"
    return
  fi

  # https://grpc.io/docs/protoc-installation/
  if [ $(uname) = 'Linux' ]; then
    sudo apt install -y protobuf-compiler
  elif [ $(uname) = 'Darwin' ]; then
    brew install protobuf
  else
    echo "UNKNOWN PLATFORM: $(uname)"
    exit 1
  fi

  protoc --version
}

function install_protoc_gen_lint () {
  go get -u github.com/ckaznocha/protoc-gen-lint
}

function install_google_api () {
	if [ -d ${THIRD_PARTY_DIR}/google/api ]; then
    echo "install skipped: ${THIRD_PARTY_DIR}/google/api exists"
    return
  fi

  mkdir -p ${THIRD_PARTY_DIR}/google/api
	curl https://raw.githubusercontent.com/googleapis/googleapis/master/google/api/annotations.proto > ${THIRD_PARTY_DIR}/google/api/annotations.proto
	curl https://raw.githubusercontent.com/googleapis/googleapis/master/google/api/http.proto > ${THIRD_PARTY_DIR}/google/api/http.proto
}

function install_protoc_gen_openapiv2 () {
	if [ -d ${THIRD_PARTY_DIR}/protoc-gen-openapiv2/options ]; then
    echo "install skipped: ${THIRD_PARTY_DIR}/protoc-gen-openapiv2/options exists"
    return
  fi

  mkdir -p ${THIRD_PARTY_DIR}/protoc-gen-openapiv2/options
	curl https://raw.githubusercontent.com/grpc-ecosystem/grpc-gateway/master/protoc-gen-openapiv2/options/annotations.proto > ${THIRD_PARTY_DIR}/protoc-gen-openapiv2/options/annotations.proto
	curl https://raw.githubusercontent.com/grpc-ecosystem/grpc-gateway/master/protoc-gen-openapiv2/options/openapiv2.proto > ${THIRD_PARTY_DIR}/protoc-gen-openapiv2/options/openapiv2.proto
}

function main () {
  install_protoc
  install_google_api
  install_protoc_gen_lint
  install_protoc_gen_openapiv2
}

main
