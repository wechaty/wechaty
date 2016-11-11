#!/usr/bin/env bash

[ -z "$1" ] && {
  echo
  echo "Usage: npm-set-latest.sh <wechaty@version>"
  echo
  exit 1
}

npm dist-tag add "$1" latest
