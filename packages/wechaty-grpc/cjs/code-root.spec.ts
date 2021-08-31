#!/usr/bin/env -S ts-node --project tsconfig.cjs.json

import { test } from 'tstest'

import { codeRoot } from './code-root'

test('CJS: codeRoot()', async t => {
  t.ok(codeRoot, 'should exist codeRoot')
})
