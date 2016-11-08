#!/usr/bin/env bats


function dockerRun() {
  docker run -v "$(pwd)":/bot ${IMAGE_NAME:-'wechaty:test'} $@
}

fixture=test/fixture/docker

@test "javascript bot" {
  cd "$fixture"
  run dockerRun js-bot.js
  [ "$status" -eq 0 ]
}

@test "javascript syntax error" {
  cd "$fixture"
  run dockerRun syntax-error.js
  [ "$status" -ne 0 ]
}


@test "typescript bot" {
  cd "$fixture"
  run dockerRun ts-bot.ts
  [ "$status" -eq 0 ]
}

@test "typescript type error" {
  cd "$fixture"
  run dockerRun type-error.ts
  [ "$status" -ne 0 ]
}

@test "javascript bot with require" {
  cd "$fixture/with-package-json/"
  run dockerRun with-require.js
  [ "$status" -eq 0 ]
}

@test "javascript bot require error" {
  cd "$fixture/with-package-json/"
  run dockerRun with-require-error.js
  [ "$status" -ne 0 ]
}

@test "typescript bot with import" {
  cd "$fixture/with-package-json/"
  run dockerRun with-import.ts
  [ "$status" -eq 0 ]
}

@test "typescript bot with import error" {
  cd "$fixture/with-package-json/"
  run dockerRun with-import-error.ts
  [ "$status" -ne 0 ]
}

