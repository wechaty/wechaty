#!/bin/sh
#
# Credit: https://github.com/cusspvz/node.docker/blob/master/entrypoint
#

echo "Docker Starting Wechaty v$(wechaty-version)"

# to identify run env (for tests)
export WECHATY_DOCKER='docker'

echo "WECHATY_HEAD=$WECHATY_HEAD"
if [ "$WECHATY_HEAD" != "phantomjs" ]; then
  export DISPLAY=':99.0'
  Xvfb :99 -screen 0 1024x768x24 &
  echo "Xvfb started on DISPLAY=$DISPLAY"
fi

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

