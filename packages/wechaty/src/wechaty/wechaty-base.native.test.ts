/** Checks installed-provider lookup and startup failure in a fresh native process. */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'

import { NO_PUPPET_MESSAGE } from '../puppet-config.ts'
import { WechatyBase } from './wechaty-base.ts'
import './wechaty-impl.ts'

test('init() without a puppet explains how to set one', async t => {
  const original = process.env['WECHATY_PUPPET']
  t.after(() => {
    if (original === undefined) {
      delete process.env['WECHATY_PUPPET']
    } else {
      process.env['WECHATY_PUPPET'] = original
    }
  })
  delete process.env['WECHATY_PUPPET']

  const bot = new WechatyBase({})
  await assert.rejects(bot.init(), { message: NO_PUPPET_MESSAGE }, 'should reject: 2.0 has no default puppet')
  assert.match(NO_PUPPET_MESSAGE, /WECHATY_PUPPET=/, 'should name the environment variable')

  // The failed init() must not mark the puppet as set up.
  process.env['WECHATY_PUPPET'] = 'wechaty-puppet-mock'
  try {
    await bot.init()
    assert.ok(bot.puppet, 'should resolve the puppet from WECHATY_PUPPET on a later init()')
  } finally {
    await bot.stop()
  }
})

test('startup puppet failure rejects without an error listener (#2855)', () => {
  const baseUrl = new URL('./wechaty-base.ts', import.meta.url).href
  const implUrl = new URL('./wechaty-impl.ts', import.meta.url).href
  const script = [
    `await import(${JSON.stringify(implUrl)})`,
    `const { WechatyBase } = await import(${JSON.stringify(baseUrl)})`,
    `const { PuppetMock } = await import('wechaty-puppet-mock')`,
    `const puppet = new PuppetMock()`,
    `puppet.start = async () => { throw new Error('puppet start failed') }`,
    `const bot = new WechatyBase({ puppet })`,
    `try { await bot.start(); process.exitCode = 1 } catch { process.exit(0) }`,
  ].join(';')
  const nodeExecutable = process.env['NODE_BINARY'] ?? process.execPath
  // The child imports workspace packages from source, like the test runner.
  const result = spawnSync(nodeExecutable, [ '--input-type=module', '-e', script ], {
    encoding: 'utf8',
    timeout: 30_000,
  })
  assert.equal(result.status, 0, 'should reject startup without an error listener in an isolated process')
})
