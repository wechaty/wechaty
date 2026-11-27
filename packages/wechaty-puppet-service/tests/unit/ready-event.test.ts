/**
 * Test that a client connecting to an already logged-in, ready puppet gets
 * `login` first and then `ready`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type {
  PuppetOptions,
} from 'wechaty-puppet'
import PuppetMock from 'wechaty-puppet-mock'
import { freePort } from '../fixtures/free-port.ts'
import { useTempHome } from '../fixtures/temp-home.ts'

import PuppetService, {
  PuppetServer,
  type PuppetServerOptions,
} from '../../src/mod.ts'

const NIL_UUID_V4 = '00000000-0000-0000-0000-000000000000'

test('ready event test', async t => {
  useTempHome(t)
  const PORT = await freePort()
  const TOKEN = `insecure_${NIL_UUID_V4}`
  const ENDPOINT = `0.0.0.0:${PORT}`

  /**
   * Puppet Server
   */
  const puppet = new PuppetMock()

  const serverOptions = {
    endpoint: ENDPOINT,
    puppet,
    token: TOKEN,
  } as PuppetServerOptions

  const puppetServer = new PuppetServer(serverOptions)

  await puppet.start()
  await puppetServer.start()
  // Mark puppet logged-in and ready before the service client connects
  puppet.login('logged in')
  puppet.emit('ready')
  await puppet.ready()

  /**
   * Puppet Service Client
   */
  const puppetOptions = {
    endpoint: ENDPOINT,
    token: TOKEN,
  } as PuppetOptions

  // check if ready event is emited on this ready-ed puppet
  const puppetService = new PuppetService(puppetOptions)
  const eventList: any[] = []

  const loginFuture = new Promise<void>(resolve => puppetService.once('login', () => {
    eventList.push('login')
    resolve()
  }))
  const readyFuture = new Promise<void>(resolve => puppetService.once('ready', () => {
    eventList.push('ready')
    resolve()
  }))

  await Promise.all([
    puppetService.start(),
    loginFuture,
    readyFuture,
  ])

  assert.deepEqual(eventList, [ 'login', 'ready' ], 'should have `login` event first then `ready`')

  await puppetService.stop()
  await puppetServer.stop()
})
