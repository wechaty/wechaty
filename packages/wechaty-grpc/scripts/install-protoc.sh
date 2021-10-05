#!/usr/bin/env bash
set -e
set -o pipefail

# https://stackoverflow.com/a/4774063/1123955
WORK_DIR="$( cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 ; pwd -P )"
REPO_DIR="$( cd "$WORK_DIR/../" >/dev/null 2>&1 ; pwd -P )"

THIRD_PARTY_DIR="$REPO_DIR/third-party/"

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

}

function check_protoc_version () {
  # libprotoc 3.11.3
  protocVersion=$(protoc --version | cut -d' ' -f 2)
  majorVer=$(echo $protocVersion | cut -d. -f 1)
  minorVer=$(echo $protocVersion | cut -d. -f 2)

  (($majorVer == 3)) || {
    echo "protoc major version must >= 3 (the installed version is $protocVersion)"
    exit 1
  }

  # https://github.com/wechaty/grpc/issues/109
  (($minorVer >= 17)) || {
    echo "protoc minor version must >= 17 (the installed version is $protocVersion)"
    exit 1
  }

  echo "protoc version check: v${protocVersion} OK"
}

function install_protoc_gen_lint () {
  go install github.com/ckaznocha/protoc-gen-lint@latest
}

function install_proto_google_api () {
	if [ -d ${THIRD_PARTY_DIR}/google/api ]; then
    echo "install skipped: ${THIRD_PARTY_DIR}/google/api exists"
    return
  fi

  mkdir -p ${THIRD_PARTY_DIR}/google/api
	curl https://raw.githubusercontent.com/googleapis/googleapis/master/google/api/annotations.proto > ${THIRD_PARTY_DIR}/google/api/annotations.proto
	curl https://raw.githubusercontent.com/googleapis/googleapis/master/google/api/http.proto > ${THIRD_PARTY_DIR}/google/api/http.proto
  curl https://raw.githubusercontent.com/googleapis/googleapis/master/google/api/http.proto > ${THIRD_PARTY_DIR}/google/api/http.proto
}

function install_protoc_gen_openapiv2 () {
  pushd "$REPO_DIR/openapi"
  make install
  popd
}

# function install_google_protobuf_wrappers () {
# 	if [ -d ${THIRD_PARTY_DIR}/google/protobuf ]; then
#     echo "install skipped: ${THIRD_PARTY_DIR}/google/protobuf exists"
#     return
#   fi

#   wget \
#     --directory-prefix ${THIRD_PARTY_DIR}/google/protobuf \
#     https://raw.githubusercontent.com/protocolbuffers/protobuf/master/src/google/protobuf/wrappers.proto \
#     https://raw.githubusercontent.com/protocolbuffers/protobuf/master/src/google/protobuf/descriptor.proto
# }

function install_protoc_gen_doc () {
  if command -v protoc-gen-doc; then
    echo "install skipped: $(command -v protoc-gen-doc) exists"
    return 0
  fi
  go install github.com/pseudomuto/protoc-gen-doc/cmd/protoc-gen-doc@latest
}

function main () {
  install_protoc
  check_protoc_version

  install_protoc_gen_lint
  install_protoc_gen_openapiv2
  install_protoc_gen_doc

  install_proto_google_api
}

main
