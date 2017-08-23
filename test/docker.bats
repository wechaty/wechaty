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

@test "javascript es6 import should success" {
  cd "$fixture"
  run dockerRun es6-import.js
  [ "$status" -eq 0 ] # should succ
}

@test "javascript es6 import with NODE_ENV=production should fail" {
  cd "$fixture"
  run dockerRun -e NODE_ENV=production es6-import.js
  [ "$status" -ne 0 ] # should fail
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

@test "typescript bot with import = require()" {
  cd "$fixture"
  run dockerRun import-require.ts
  [ "$status" -eq 0 ]
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

@test "doctor(default by npm run)" {
  run dockerRun doctor
  [ "$status" -eq 0 ]
}

@test "run doctor" {
  run dockerRun run doctor
  [ "$status" -eq 0 ]
}

@test "run non-exist command" {
  run dockerRun run fdasfadsfasdfasdfasdfasd
  [ "$status" -ne 0 ]
}

@test "direct non-exist command" {
  run dockerRun fdasfadsfasdfasdfasdfasd
  [ "$status" -ne 0 ]
}

