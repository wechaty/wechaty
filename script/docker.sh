#!/bin/sh
#
# 1. CircleCI with `Btrfs volume error`
#   https://circleci.com/docs/docker-btrfs-error/
#
imageName='wechaty:test'

optRm='--rm'
[ -n "$CIRCLECI" ] && optRm='--rm=false'

if [ "$1" = "build" ] || [ "$1" = "" ]; then
  echo docker build "$optRm" -t "$imageName" .
  exec docker build "$optRm" -t "$imageName" .
  exit $?
fi

echo docker run -ti "$optRm" -v /dev/shm:/dev/shm "$imageName" $@
exec docker run -ti "$optRm" -v /dev/shm:/dev/shm "$imageName" $@
exit $?
