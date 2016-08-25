#!/bin/sh
#
# Credit: https://github.com/cusspvz/node.docker/blob/master/entrypoint
#

if [ "$WECHATY_HEAD" != "phantomjs" ]; then
  export DISPLAY=':99.0'
  Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &
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
   [ "$1" = "bash" ] || \
   [ "$1" = "/bin/bash" ] || \
   [ "$1" = "/bin/sh" ];
  then
    exec /bin/bash -s
    exit $?
fi

echo "feature not implemented, please change entrypoint"
