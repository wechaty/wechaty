#!/bin/sh
#
# Wechaty - Connect ChatBots
#
# https://github.com/wechaty/wechaty
#
# Original Code Credit: https://github.com/cusspvz/node.docker/blob/master/entrypoint
#
set -e

echo
echo "Starting Wechaty v$(wechaty-version) ..."
echo

# to identify run env (for tests)
export WECHATY_DOCKER='docker'
# set CI here, in order to force ava to output use --verbose param, which is fit docker console log
export CI="FORCE_AVA_OUTPUT_VERBOSE"

# [ "$WECHATY_HEAD" != "" ] && {
#   echo "WECHATY_HEAD=$WECHATY_HEAD"
# }

# if [ "$WECHATY_HEAD" != "phantomjs" ]; then
#   export DISPLAY=':99.0'
#   Xvfb :99 -ac -screen 0 640x480x8 -nolisten tcp &
#   echo "Xvfb started on DISPLAY=$DISPLAY"
# fi

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

