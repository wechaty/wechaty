#!/bin/sh
#
# 1. CircleCI with `Btrfs volume error`
#   https://circleci.com/docs/docker-btrfs-error/
#

optRm='--rm'
[ -n "$CIRCLECI" ] && optRm='--rm=false'

if [ "$1" = "build" ] || [ "$1" = "" ]; then
  exec docker build "$optRm" -t wechaty .
  exit $?
fi

exec docker run -ti "$optRm" -v /dev/shm:/dev/shm wechaty $@
exit $?
