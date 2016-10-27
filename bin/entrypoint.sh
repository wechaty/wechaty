#!/bin/sh
#
# Wechaty - Connect ChatBots
#
# https://github.com/wechaty/wechaty
#
set -e

echo
echo "Starting Wechaty v$(wechaty-version) ..."
echo

# set CI here, in order to force ava to output use --verbose param, which is fit docker console log
# export CI="FORCE_AVA_OUTPUT_VERBOSE"

if [ "$1" = "start" ]; then
  exec npm start
  exit $?
fi

if [ "$1" = "test" ]; then
  exec npm test
  exit $?
fi

if [ "$1" = "shell" ] || \
  [ "$1" = "sh" ] || \
  [ "$1" = "bash" ]
then
  exec /bin/bash -s
  exit $?
fi

echo "feature not implemented, please change entrypoint"

