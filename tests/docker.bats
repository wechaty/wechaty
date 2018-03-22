#!/usr/bin/env bats

function dockerRun() {
  docker run -v "$(pwd)":/bot ${IMAGE_NAME:-'wechaty:test'} $@
}

fixtures=tests/fixtures/docker

@test "should succ with a simple javascript" {
  cd "$fixtures"
  run dockerRun js-bot.js
  [ "$status" -eq 0 ]
}

@test "should fail when javascript syntax error" {
  cd "$fixtures"
  run dockerRun syntax-error.js
  [ "$status" -ne 0 ]
}

@test "should succ with javascript es6 import syntax" {
  cd "$fixtures"
  run dockerRun es6-import.js
  [ "$status" -eq 0 ] # should succ
}

@test "should fail with javascript es6 import when setting NODE_ENV=production" {
  cd "$fixtures"
  run dockerRun -e NODE_ENV=production es6-import.js
  [ "$status" -ne 0 ] # should fail
}

@test "should succ with a simple typescript" {
  cd "$fixtures"
  run dockerRun ts-bot.ts
  [ "$status" -eq 0 ]
}

@test "should fail with unmatch types in typescript" {
  cd "$fixtures"
  run dockerRun type-error.ts
  [ "$status" -ne 0 ]
}

@test "should succ when we using 'import = require()' in typescript" {
  cd "$fixtures"
  run dockerRun import-require.ts
  [ "$status" -eq 0 ]
}

@test "should succ when using require with javascript" {
  cd "$fixtures/with-package-json/"
  run dockerRun with-require.js
  [ "$status" -eq 0 ]
}

@test "should fail when require a not exist module in javascript" {
  cd "$fixtures/with-package-json/"
  run dockerRun with-require-error.js
  [ "$status" -ne 0 ]
}

@test "should succ when using import in typescript" {
  cd "$fixtures/with-package-json/"
  run dockerRun with-import.ts
  [ "$status" -eq 0 ]
}

@test "should fail when import a not exist module in typescript" {
  cd "$fixtures/with-package-json/"
  run dockerRun with-import-error.ts
  [ "$status" -ne 0 ]
}

@test "should succ with arg: 'doctor' (which is the default by npm run)" {
  run dockerRun doctor
  [ "$status" -eq 0 ]
}

@test "should succ with arg: 'run doctor'" {
  run dockerRun run doctor
  [ "$status" -eq 0 ]
}

@test "should fail when run an unknown arg" {
  run dockerRun run fdasfadsfasdfasdfasdfasd
  [ "$status" -ne 0 ]
}

@test "should fail when passing an unknown arg directly" {
  run dockerRun fdasfadsfasdfasdfasdfasd
  [ "$status" -ne 0 ]
}

