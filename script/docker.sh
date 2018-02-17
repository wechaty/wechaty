#!/bin/bash
#
# 1. CircleCI with `Btrfs volume error`
#   https://circleci.com/docs/docker-btrfs-error/
#
set -e

imageName='wechaty'

options='--rm'
[ -n "$CIRCLECI" ] && options='--rm=false'
[ -n "$NO_CACHE" ] && options="$options --no-cache"

declare -i ret=0

case "$1" in
  build | '')
    echo docker build $options -t "$imageName" .
    exec docker build $options -t "$imageName" .

#    echo docker build $options -t "${imageName}:onbuild" -f Dockerfile.onbuild .
#    exec docker build $options -t "${imageName}:onbuild" -f Dockerfile.onbuild .

    ret=$?
    ;;

  test)
    echo "bats test/"
    IMAGE_NAME="$imageName" bats test/

    echo docker run -ti $options -v /dev/shm:/dev/shm "$imageName" test
    exec docker run -ti $options -v /dev/shm:/dev/shm "$imageName" test
    ret=$?
    ;;

  clean)
    docker ps -a | grep Exited | awk '{print $1}' | xargs docker rm || true
    docker images | grep none | awk '{print $3}' | xargs docker rmi
    ;;

  *)
    echo docker run -ti $options -v /dev/shm:/dev/shm "$imageName" "$@"
    exec docker run -ti $options -v /dev/shm:/dev/shm "$imageName" "$@"
    ;;
esac

[ "$ret" -ne 0 ] && {
  echo "ERROR: exec return $ret ???"
  exit $ret
}
