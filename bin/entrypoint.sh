#!/bin/sh
#
# Wechaty - Connect ChatBots
#
# https://github.com/wechaty/wechaty
#
set -e

PATH=$PATH:/wechaty/node_modules/.bin

echo
echo -n "Starting Wechaty ... "

VERSION=$(wechaty-version 2>/dev/null)

echo "v$VERSION"
echo
echo "https://www.wechaty.io"
echo "Connecting ChatBots ... "
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
