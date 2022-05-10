#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test } from 'tstest'
import type {
  PuppetOptions,
} from 'wechaty-puppet'
import PuppetMock from 'wechaty-puppet-mock'
import getPort from 'get-port'

import PuppetService, {
  PuppetServer,
  PuppetServerOptions,
} from '../src/mod.js'

const NIL_UUID_V4 = '00000000-0000-0000-0000-000000000000'

test('ready event test', async t => {
  const PORT = await getPort()
  const TOKEN = `insecure_${NIL_UUID_V4}`
  const ENDPOINT = `0.0.0.0:${PORT}`

  /**
   * Puppet Server
   */
  const puppet = new PuppetMock()

  // set ready to true before service starts
  puppet.readyIndicator.value(true)
  ;(puppet as any).__currentUserId = 'logged in'
  const serverOptions = {
    endpoint: ENDPOINT,
    puppet: puppet,
    token: TOKEN,
  } as PuppetServerOptions

  const puppetServer = new PuppetServer(serverOptions)

  await puppetServer.start()

  /**
   * Puppet Service Client
   */
  const puppetOptions = {
    endpoint: ENDPOINT,
    token: TOKEN,
  } as PuppetOptions

  // check if ready event is emited on this ready-ed puppet
  const puppetService = new PuppetService(puppetOptions)

  let loginTime = 0
  let readyTime = 0
  const login = new Promise<void>(resolve => puppetService.once('login', () => {
    loginTime = Date.now()
    resolve()
  }))
  const ready = new Promise<void>(resolve => puppetService.once('ready', () => {
    readyTime = Date.now()
    resolve()
  }))
  await puppetService.start()
  await t.resolves(login, 'should resolve')
  await t.resolves(ready, 'should resolve')

  t.ok((readyTime - loginTime) > 80 && (readyTime - loginTime) < 120, 'time delta between login and ready event should be around 100')

  await puppetService.stop()
  await puppetServer.stop()
})
