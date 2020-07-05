#!/usr/bin/env bash

set -eo pipefail

function deployVersion () {
  SEMVER_MAJOR=$(node -e "console.log(require('semver').major('$VERSION'))")
  SEMVER_MINOR=$(node -e "console.log(require('semver').minor('$VERSION'))")

  TAG="$SEMVER_MAJOR.$SEMVER_MINOR"

  echo "Deploying TAG=$TAG"
  docker tag "${ARTIFACT_IMAGE}" "${IMAGE}:${TAG}"
  docker push "${IMAGE}:${TAG}"
}

function deployLatest () {
  echo "Deploying IMAGE=$IMAGE latest"
  docker tag "${ARTIFACT_IMAGE}" "${IMAGE}:latest"
  docker push "${IMAGE}:latest"
}

function deployNext () {
  echo "Deploying IMAGE=$IMAGE next"
  docker tag "${ARTIFACT_IMAGE}" "${IMAGE}:next"
  docker push "${IMAGE}:next"
}

function main () {
  if [ -z "$1" ]; then
    >&2 echo -e "Missing argument.\nUsage: $0 ARTIFACT_IMAGE"
    exit 1
  fi

  ARTIFACT_IMAGE=$1

  IMAGE=$(cat IMAGE)
  VERSION=$(cat VERSION)

  deployVersion

  if npx --package @chatie/semver semver-is-prod "$VERSION"; then
    deployLatest
  else
    deployLatest
  fi
}

main "$@"
