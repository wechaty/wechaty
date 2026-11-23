#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
  AssertEqual,
}             from 'tstest'

import type {
  Chunk,
}                   from './chunk-transformer.js'

test('Chunk type imported from generated code', async t => {
  const typeOk: AssertEqual<
    Chunk,
    string | Uint8Array
  > = true
  t.ok(typeOk, 'should be `string | Uint8Array`')
})
