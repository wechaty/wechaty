#!/bin/bash
#
# Wechaty - Connect ChatBots
#
# https://github.com/wechaty/wechaty
#
set -e

PATH=$PATH:/wechaty/node_modules/.bin

figlet " Wechaty "
echo ____________________________________________________
echo "            https://www.wechaty.io"
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

if [[ "$1" == *.ts || "$1" == *.js ]]; then

  botFile="$1"
  botFilePath="/bot/$1"
  shift

  if [ -f "$botFilePath" ]; then
    cd /bot && pwd
    [ -f package.json ] && {
      echo "Install dependencies modules ..."
      yarn
    }
    echo "Executing ts-node $botFilePath $@"
    ts-node "$botFilePath" $@
    ret=$?
    figlet " Wechaty "
    echo ____________________________________________________
    echo "            https://www.wechaty.io"
    figlet " Exit $ret "
    sleep 3
    exit $ret
  else
    echo "ERROR: can not found bot file: $botFile"
    exit -1
  fi

fi

exec npm $@

exit $?
