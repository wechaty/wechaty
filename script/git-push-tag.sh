#!/usr/bin/env bash

[ -z "$1" ] && {
  echo
  echo "Usage: git-push-tag.sh <tag>"
  echo
  exit 1
}

NO_HOOK=1 git push origin "$1"
