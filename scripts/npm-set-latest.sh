#!/usr/bin/env bash
#
# Author: Huan LI <zixia@zixia.net>
# https://github.com/zixia
# License: Apache-2.0
#

[ -z "$1" ] && {
  echo
  echo "Usage: npm-set-latest.sh <version>"
  echo
  exit 1
}

npm dist-tag add "wechaty@$1" latest
