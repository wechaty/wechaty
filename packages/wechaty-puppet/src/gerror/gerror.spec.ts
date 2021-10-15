#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test } from 'tstest'

import { GError } from './gerror.js'
import { Code } from './grpc.js'

test('GError class smoke testing', async t => {
  const MESSAGE = 'test'

  const gerror = GError.fromJSON(new Error(MESSAGE))
  const obj    = gerror.toJSON()

  t.equal(obj.code, Code.UNKNOWN, 'should be default code UNKNOWN')
  t.equal(obj.message, MESSAGE, 'should set message')
})
