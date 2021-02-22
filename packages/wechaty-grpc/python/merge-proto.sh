#!/usr/bin/env bash

#
# DEPRECATED: this script was deprecated
#   https://github.com/wechaty/grpc/issues/46
#
# Huan(20200222): betterproto[compiler]>=2.0.0b2 is OK
#

set -eo pipefail

function echo_name () {
  cat <<_EOF_
/******************************************************************
 * Proto File: $1
 ******************************************************************/
_EOF_
}

function strip_header () {
  sed -r '/^(syntax|package|import|option)/s/.*//'
}

function strip_package () {
  #  (base.
  # (stream event.
  sed -r 's/ \(\w+\./ \(/g' \
    | sed -r 's/ \(stream \w+\./ \(stream /'
}

function main () {
  cat <<'_EOF_'
syntax = "proto3";
import "google/protobuf/wrappers.proto";
package wechaty;
_EOF_

  for file in ../proto/wechaty/puppet/*.proto; do
    echo_name "$file"
    cat "$file" | strip_header
  done

  file='../proto/wechaty/puppet.proto'
  echo_name "$file"
  cat "$file" \
    | strip_header \
    | strip_package
}

main
