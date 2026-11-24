/**
 * Unit tests for `PuppetService`: its version, and that one client starts
 * and stops three times in a row against a running `PuppetServer`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { freePort } from '../../tests/fixtures/free-port.ts'
import { useTempHome } from '../../tests/fixtures/temp-home.ts'

import { PuppetMock } from 'wechaty-puppet-mock'

import { PuppetService } from './puppet-service.ts'
import { PuppetServer } from '../mod.ts'

test('version()', async t => {
  useTempHome(t)
  const puppet = new PuppetService({
    token: 'test',
  })
  assert.ok(puppet.version())
})

/**
 * Huan(202003):
 *  need to setup a test server to provide test token for Puppet Service
 */
test('PuppetService restart without problem', async t => {
  useTempHome(t)
  const TOKEN       = 'insecure_token'
  const PORT        = await freePort()
  const ENDPOINT    = '0.0.0.0:' + PORT

  const puppet = new PuppetMock()
  const serverOptions = {
    endpoint: ENDPOINT,
    puppet,
    token: TOKEN,
  } as const

  const puppetServer = new PuppetServer(serverOptions)
  await puppetServer.start()

  /**
   * Puppet Service Client
   */
  const puppetOptions = {
    endpoint: ENDPOINT,
    token: TOKEN,
  } as const

  const puppetService = new PuppetService(puppetOptions)

  try {
    for (let i = 0; i < 3; i++) {
      await puppetService.start()
      await puppetService.stop()
      assert.ok(true, 'start/stop-ed at #' + i)
    }
    assert.ok(true, 'PuppetService() start/restart successed.')
  } catch (e) {
    assert.fail(e as any)
  }

  await puppetServer.stop()
})
