#!/bin/sh
#
# 1. CircleCI with `Btrfs volume error`
#   https://circleci.com/docs/docker-btrfs-error/
#

RM_OPT='--rm'
[ -n "$CI" ] && RM_OPT='--rm=false'

if [ "$1" = "build" ] || [ "$1" = "" ]; then
  exec docker build "$RM_OPT" -t wechaty .
  exit $?
fi

exec docker run -ti "$RM_OPT" -v /dev/shm:/dev/shm wechaty $@
exit $?
