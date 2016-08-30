#!/bin/sh

if [ "$1" = "build" ] || [ "$1" = "" ]; then
  exec docker build -t zixia/wechaty:test .
fi

exec docker run --shm-size 256m -ti --rm zixia/wechaty:test $1
