#!/bin/sh
#
# Wechaty - Connect ChatBots
#
# https://github.com/wechaty/wechaty
#
set -e

VERSION=$(wechaty-version)

echo
echo "Starting Wechaty v$(VERSION) ..."
echo

if [ "$1" = "shell" ] || \
  [ "$1" = "sh" ] || \
  [ "$1" = "bash" ]
then
  exec /bin/bash -s
  exit $?
fi

exec npm $@

exit $?
