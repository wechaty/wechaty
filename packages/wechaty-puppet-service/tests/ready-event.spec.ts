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
    puppet,
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

  t.same(eventList, [ 'login', 'ready' ], 'should have `login` event first then `ready`')

  await puppetService.stop()
  await puppetServer.stop()
})
