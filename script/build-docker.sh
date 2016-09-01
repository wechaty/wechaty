#!/bin/sh

if [ "$1" = "build" ] || [ "$1" = "" ]; then
  exec docker build -t zixia/wechaty:test .
fi

exec docker run -v /dev/shm:/dev/shm -ti --rm zixia/wechaty:test $1
