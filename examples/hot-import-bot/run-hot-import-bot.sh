#!/usr/bin/env bash
set -e

docker run -t -i --rm --name wechaty -e WECHATY_LOG="$WECHATY_LOG" --mount type=bind,source="$(pwd)",target=/bot zixia/wechaty index.js
