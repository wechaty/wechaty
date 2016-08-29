#!/bin/sh

if [ "$1" = "test" ]; then
  exec docker run -ti --rm zixia/wechaty:test test
fi

if [ "$1" = "build" ] || [ "$1" = "" ]; then
  exec docker build -t zixia/wechaty:test .
fi

echo "unknown params"
