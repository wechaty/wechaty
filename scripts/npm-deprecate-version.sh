#!/usr/bin/env bash
set -e

# https://docs.npmjs.com/cli/deprecate
#   $ npm deprecate <pkg>[@<version>] <message>

# npm semver calculator
#   - https://semver.npmjs.com

if [ $# -eq 0 ]; then
  echo
  echo "Usage:"
  echo
  echo "  deprecate all the 0.15.* versions."
  echo "  \$ $0 0.15"
  echo "  \$ $0 0.15.*"
  echo "  \$ $0 ^0.15.1"
  echo

else
  message="${2:-WARNING: this version(odd number) is coming from a developing branch which means it is very possible UNSTABLE. Please use the latest version with even number if you are in production. You can know more about the Wechaty version numbering design at https://github.com/wechaty/wechaty/issues/905}"

  npm deprecate "wechaty@$1" "$message"

fi
