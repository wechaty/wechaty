#!/usr/bin/env ts-node

import {
  test,
  sinon,
}             from 'tstest'

import {
  PuppetHostie,
  PuppetHostieServer,
  PuppetHostieServerOptions,
}                               from '../src/'
import {
  PuppetOptions,
}                               from 'wechaty-puppet'

import {
  PuppetMock,
}                 from 'wechaty-puppet-mock'

test('integration testing', async (t) => {
  const TOKEN    = 'test_token'
  const ENDPOINT = '0.0.0.0:8788'
  const DING     = 'ding_data'

  /**
   * Puppet in Hostie
   */
  const PUPPET = new PuppetMock()
  const spyStart = sinon.spy(PUPPET, 'start')
  const spyOn    = sinon.spy(PUPPET, 'on')
  const spyDing  = sinon.spy(PUPPET, 'ding')

  /**
   * Hostie Server
   */
  const serverOptions = {
    endpoint : ENDPOINT,
    puppet   : PUPPET,
    token    : TOKEN,
  } as PuppetHostieServerOptions

  const hostieServer = new PuppetHostieServer(serverOptions)
  await hostieServer.start()

  /**
   * Puppet Hostie Client
   */
  const puppetOptions = {
    endpoint: ENDPOINT,
    token: TOKEN,
  } as PuppetOptions

  const puppetHostie = new PuppetHostie(puppetOptions)
  await puppetHostie.start()

  t.ok(spyStart.called, 'should called the hostie server start() function')

  const future = new Promise((resolve, reject) => {
    puppetHostie.on('dong', resolve)
    puppetHostie.on('error', reject)
  })

  puppetHostie.ding(DING)
  const result = await future

  t.ok(spyOn.called,    'should called the hostie server on() function')
  t.ok(spyDing.called,  'should called the hostie server ding() function')

  t.equal(result, DING, 'should get a successful roundtrip for ding')

  /**
   * Stop
   *  1. Puppet in Hostie
   *  2. Hostie Service
   *  3. Puppet Hostie Client
   *
   */
  await puppetHostie.stop()
  await hostieServer.stop()
})
