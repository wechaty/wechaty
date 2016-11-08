#!/usr/bin/env bats


function dockerRun() {
  docker run -v "$(pwd)":/bot ${IMAGE_NAME:-'wechaty:test'} $@
}

@test "javascript bot" {
  cd docker-bot
  run dockerRun js-bot.js
  [ "$status" -eq 0 ]
}

@test "javascript syntax error" {
  cd docker-bot
  run dockerRun syntax-error.js
  [ "$status" -ne 0 ]
}


@test "typescript bot" {
  cd docker-bot
  run dockerRun ts-bot.ts
  [ "$status" -eq 0 ]
}

@test "typescript type error" {
  cd docker-bot
  run dockerRun type-error.ts
  [ "$status" -ne 0 ]
}

@test "javascript bot with require" {
  cd docker-bot/with-package-json/
  run dockerRun with-require.js
  [ "$status" -eq 0 ]
}

@test "javascript bot require error" {
  cd docker-bot/with-package-json/
  run dockerRun with-require-error.js
  [ "$status" -ne 0 ]
}

@test "typescript bot with import" {
  cd docker-bot/with-package-json/
  run dockerRun with-import.ts
  [ "$status" -eq 0 ]
}

@test "typescript bot with import error" {
  cd docker-bot/with-package-json/
  run dockerRun with-import-error.ts
  [ "$status" -ne 0 ]
}

