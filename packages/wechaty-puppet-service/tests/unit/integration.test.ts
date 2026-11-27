/**
 * End-to-end test over gRPC: a `PuppetService` client starts the served
 * `PuppetMock` and gets `dong` back for its `ding`.
 */
import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

import type {
  PuppetOptions,
}                 from 'wechaty-puppet'
import {
  PuppetMock,
}                 from 'wechaty-puppet-mock'
import { freePort } from '../fixtures/free-port.ts'
import { useTempHome } from '../fixtures/temp-home.ts'

import {
  PuppetService,
  PuppetServer,
  type PuppetServerOptions,
}                               from '../../src/mod.ts'

const NIL_UUID_V4 = '00000000-0000-0000-0000-000000000000'

test('Integration testing', async t => {
  useTempHome(t)
  const PORT     = await freePort()
  const TOKEN    = `insecure_${NIL_UUID_V4}`
  const ENDPOINT = `0.0.0.0:${PORT}`

  const DING     = '__ding_data__'

  /**
   * Puppet in Service
   */
  const puppet = new PuppetMock()
  const spyStart = mock.method(puppet, 'onStart')
  const spyOn    = mock.method(puppet, 'on')
  const spyDing  = mock.method(puppet, 'ding')

  /**
   * Puppet Server
   */
  const serverOptions = {
    endpoint : ENDPOINT,
    puppet,
    token    : TOKEN,
  } as PuppetServerOptions

  const puppetServer = new PuppetServer(serverOptions)
  await puppetServer.start()

  /**
   * Puppet Service Client
   */
  const puppetOptions = {
    endpoint : ENDPOINT,
    token    : TOKEN,
  } as PuppetOptions

  const puppetService = new PuppetService(puppetOptions)
  await puppetService.start()

  assert.ok((spyStart.mock.callCount() > 0), 'should called the puppet server start() function')

  const future = new Promise<string>((resolve, reject) => {
    const offError = () => puppetService.off('error', reject)

    puppetService.once('dong', payload => {
      resolve(payload.data || '')
      offError()
    })
    puppetService.once('error', e => {
      reject(e)
      offError()
    })
  })

  puppetService.ding(DING)
  const result = await future

  assert.ok((spyOn.mock.callCount() > 0),    'should called the puppet server on() function')
  assert.ok((spyDing.mock.callCount() > 0),  'should called the puppet server ding() function')

  assert.equal(result, DING, 'should get a successful roundtrip for ding')

  /**
   * Stop
   *  1. Puppet in Service
   *  2. Puppet Service Server
   *  3. Puppet Service Client
   *
   */
  await puppetService.stop()
  await puppetServer.stop()
})
