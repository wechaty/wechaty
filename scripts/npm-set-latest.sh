#!/usr/bin/env bash

[ -z "$1" ] && {
  echo
  echo "Usage: npm-set-latest.sh <version>"
  echo
  exit 1
}

npm dist-tag add "wechaty@$1" latest
