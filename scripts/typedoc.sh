#!/usr/bin/env bash
set -e

typedoc \
  --includeDeclarations \
  --externalPattern **/lib/** \
  --mode file \
  --name "Wechaty Documentation" \
  --out dist/docs/ \
  src/
