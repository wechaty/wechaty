#!/bin/bash -x

set -eo pipefail

export ARTIFACT_IMAGE="${ARTIFACT_IMAGE:-wechaty/wechaty:artifact}"

function dockerBuild () {
  platform=$1     # `all` for all platforms, `linux/amd64`, `linux/arm64`, etc.
  tag=${2}        # set the tag for building image
  deploy=$3       # `true` for deploy, not set for local build

  # Shellcheck - https://github.com/koalaman/shellcheck/wiki/SC2086
  options=('--rm')
  [ -n "$NO_CACHE" ] && options+=('--no-cache')

  [ "$platform" == "all" ]  && platform='linux/amd64,linux/arm64'
  [ -n "$deploy" ]          && options+=('--push')

  cat <<_CMD_
    docker buildx build \
    "${options[@]}" \
    --platform "$platform" \
    --tag "wechaty/wechaty:$tag" \
    .
_CMD_

  docker buildx build \
    "${options[@]}" \
    --platform "$platform" \
    --tag "wechaty/wechaty:$tag" \
    .
}

function deployOnbuild () {
  export tag=$1

  echo "Building & Deploying 'wechaty/onbuild:$tag' based on 'wechaty/wechaty:$tag'"

  docker buildx build \
      --build-arg "WECHATY_BASE=wechaty/wechaty:$tag" \
      --platform 'linux/amd64,linux/arm64' \
      --tag "wechaty/onbuild:$tag" \
      --push \
      -f Dockerfile.onbuild \
      .
}

function main () {
declare -i ret=0

  case "$1" in
    build | '')
      docker build \
        --rm \
        --tag "$ARTIFACT_IMAGE" \
        .

      ret=$?
      ;;

    test)
      echo "Testing the docker image behaviors to make sure it works as expected..."
      echo "bats tests/"
      IMAGE_NAME="$ARTIFACT_IMAGE" bats tests/

      echo
      echo
      echo docker run -i --rm -v /dev/shm:/dev/shm "$ARTIFACT_IMAGE" test
      exec docker run -i --rm -v /dev/shm:/dev/shm "$ARTIFACT_IMAGE" test
      ret=$?
      ;;

    deploy)
      releaseTags=$(node --experimental-strip-types --input-type=module <<'NODE'
import { readFileSync } from 'node:fs'
import { dockerTags } from './scripts/docker-tags.ts'

const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
const { versionTag, channel } = dockerTags(version)
console.log(`${versionTag} ${channel}`)
NODE
      )
      read -r versionTag channel <<< "$releaseTags"

      dockerBuild all "$versionTag" deploy
      deployOnbuild "$versionTag"
      dockerBuild all "$channel" deploy
      deployOnbuild "$channel"
      ;;

    clean)
      docker ps -a | grep Exited | awk '{print $1}' | xargs docker rm || true
      docker images | grep none | awk '{print $3}' | xargs docker rmi
      ;;

    *)
      echo docker run -ti --rm -v /dev/shm:/dev/shm "$ARTIFACT_IMAGE" "$@"
      exec docker run -ti --rm -v /dev/shm:/dev/shm "$ARTIFACT_IMAGE" "$@"
      ;;
  esac

  [ "$ret" -ne 0 ] && {
    echo "ERROR: exec return $ret ???"
  }

  return $ret
}

main "$@"
