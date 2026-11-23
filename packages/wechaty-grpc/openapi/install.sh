#!/usr/bin/env bash

set -e

# https://stackoverflow.com/a/4774063/1123955
SCRIPTPATH="$( cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 ; pwd -P )"
THIRD_PARTY_DIR="${SCRIPTPATH}/../third-party/"

function go_install () {
  go mod download github.com/grpc-ecosystem/grpc-gateway@latest
  # go mod download google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

  go install \
    google.golang.org/protobuf/cmd/protoc-gen-go@latest

  go install \
    google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

  #
  # Huan(202108): https://github.com/golang/go/issues/44129
  #   workaround: `go get ...` first.
  #
  go install \
    github.com/grpc-ecosystem/grpc-gateway/v2/protoc-gen-grpc-gateway@latest

  go install \
    github.com/grpc-ecosystem/grpc-gateway/v2/protoc-gen-openapiv2@latest

}

function install_proto_protoc_gen_openapiv2 () {
	if [ -d ${THIRD_PARTY_DIR}/protoc-gen-openapiv2/options ]; then
    echo "install skipped: ${THIRD_PARTY_DIR}/protoc-gen-openapiv2/options exists"
    return
  fi

  mkdir -p ${THIRD_PARTY_DIR}/protoc-gen-openapiv2/options
	curl https://raw.githubusercontent.com/grpc-ecosystem/grpc-gateway/master/protoc-gen-openapiv2/options/annotations.proto > ${THIRD_PARTY_DIR}/protoc-gen-openapiv2/options/annotations.proto
	curl https://raw.githubusercontent.com/grpc-ecosystem/grpc-gateway/master/protoc-gen-openapiv2/options/openapiv2.proto > ${THIRD_PARTY_DIR}/protoc-gen-openapiv2/options/openapiv2.proto
}

main () {
  go_install
  install_proto_protoc_gen_openapiv2
}

main
