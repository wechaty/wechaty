#!/bin/bash -x

set -eo pipefail

function deployVersion () {
  ARTIFACT_IMAGE=$1
  IMAGE=$2
  TAG=$3

  echo "Deploying TAG=$TAG"
  docker tag "${ARTIFACT_IMAGE}" "${IMAGE}:${TAG}"
  docker push "${IMAGE}:${TAG}"
}

function deployLatest () {
  ARTIFACT_IMAGE=$1
  IMAGE=$2

  echo "Deploying IMAGE=$IMAGE latest"
  docker tag "${ARTIFACT_IMAGE}" "${IMAGE}:latest"
  docker push "${IMAGE}:latest"
}

function deployNext () {
  ARTIFACT_IMAGE=$1
  IMAGE=$2

  echo "Deploying IMAGE=$IMAGE next"
  docker tag "${ARTIFACT_IMAGE}" "${IMAGE}:next"
  docker push "${IMAGE}:next"
}

function deployOnbuild () {
  ARTIFACT_IMAGE=$1
  TAG=$2

  docker build -t "wechaty/onbuild:$TAG" - <<__DOCKERFILE_ONBUILD__
FROM $ARTIFACT_IMAGE

ONBUILD ARG NODE_ENV
ONBUILD ENV NODE_ENV \$NODE_ENV

ONBUILD WORKDIR /bot

ONBUILD COPY package.json .
ONBUILD RUN jq 'del(.dependencies.wechaty)' package.json | sponge package.json \
    && npm install \
    && sudo rm -fr /tmp/* ~/.npm
ONBUILD COPY . .

ONBUILD RUN npm run build --if-present
CMD [ "npm", "start" ]
__DOCKERFILE_ONBUILD__

  echo "Deploying wechaty/onbuild:$TAG"
  docker push "wechaty/onbuild:$TAG"
}

function main () {
  artifactImage='wechaty:artifact'
  dockerImage='wechaty/wechaty'

  # Shellcheck - https://github.com/koalaman/shellcheck/wiki/SC2086
  options=('--rm')
  [ -n "$NO_CACHE" ] && options+=('--no-cache')

  declare -i ret=0

  case "$1" in
    build | '')
      echo docker build "${options[@]}" -t "$artifactImage" .
      exec docker build "${options[@]}" -t "$artifactImage" .

  #    echo docker build "${options[@]}" -t "${artifactImage}:onbuild" -f Dockerfile.onbuild .
  #    exec docker build "${options[@]}" -t "${artifactImage}:onbuild" -f Dockerfile.onbuild .

      ret=$?
      ;;

    test)
      echo "Testing the docker image behaviors to make sure it works as expected..."
      echo "bats tests/"
      IMAGE_NAME="$artifactImage" bats tests/

      echo
      echo
      echo docker run -i "${options[@]}" -v /dev/shm:/dev/shm "$artifactImage" test
      exec docker run -i "${options[@]}" -v /dev/shm:/dev/shm "$artifactImage" test
      ret=$?
      ;;

    deploy)
      version=$(npx pkg-jq -r .version)
      majorVer=$(echo "$version" | cut -d. -f1)
      minorVer=$(echo "$version" | cut -d. -f2)
      tag="${majorVer}.${minorVer}"

      deployVersion "$artifactImage" "$dockerImage" "$tag"
      deployOnbuild "$artifactImage" "$tag"

      if npx --package @chatie/semver semver-is-prod "$version"; then
        deployLatest "$artifactImage" "$dockerImage"
        deployOnbuild "$artifactImage" latest
      else
        deployNext "$artifactImage" "$dockerImage"
        deployOnbuild "$artifactImage" next
      fi
      ;;

    clean)
      docker ps -a | grep Exited | awk '{print $1}' | xargs docker rm || true
      docker images | grep none | awk '{print $3}' | xargs docker rmi
      ;;

    *)
      echo docker run -ti "${options[@]}" -v /dev/shm:/dev/shm "$artifactImage" "$@"
      exec docker run -ti "${options[@]}" -v /dev/shm:/dev/shm "$artifactImage" "$@"
      ;;
  esac

  [ "$ret" -ne 0 ] && {
    echo "ERROR: exec return $ret ???"
  }

  return $ret
}

main "$@"
