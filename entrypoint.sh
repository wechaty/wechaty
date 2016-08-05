#!/bin/bash
#
# Credit: https://github.com/cusspvz/node.docker/blob/master/entrypoint
#

if [ "$1" == "start" ]; then
    exec npm start
    exit $?
fi

if [ "$1" == "test" ]; then
    exec npm test
    exit $?
fi

if [ "$1" == "shell" ] || \
   [ "$1" == "sh" ] || \
   [ "$1" == "bash" ] || \
   [ "$1" == "/bin/bash" ] || \
   [ "$1" == "/bin/sh" ];
  then
    exec /bin/sh -s
    exit $?
fi

echo "feature not implemented, please change entrypoint"
