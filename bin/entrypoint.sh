#!/bin/sh
#
# Wechaty - Connect ChatBots
#
# https://github.com/wechaty/wechaty
#
set -e

PATH=$PATH:/wechaty/node_modules/.bin

figlet " Wechaty "
echo ____________________________________________________
echo "              https://www.wechaty.io"
figlet Connecting
figlet ChatBots

echo
echo -n "Starting Wechaty ... "

VERSION=$(wechaty-version 2>/dev/null)

echo "v$VERSION"
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
