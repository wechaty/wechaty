#!/usr/bin/env ts-node

import {
  test,
  sinon,
}             from 'tstest'

import {
  PuppetOptions,
}                 from 'wechaty-puppet'
import {
  PuppetMock,
}                 from 'wechaty-puppet-mock'

import {
  PuppetService,
  PuppetServer,
  PuppetServerOptions,
}                               from '../src/mod'

test('integration testing', async (t) => {
  const TOKEN    = 'test_token'
  const ENDPOINT = '0.0.0.0:8788'
  const DING     = 'ding_data'

  /**
   * Puppet in Service
   */
  const puppet = new PuppetMock()
  const spyStart = sinon.spy(puppet, 'start')
  const spyOn    = sinon.spy(puppet, 'on')
  const spyDing  = sinon.spy(puppet, 'ding')

  /**
   * Puppet Server
   */
  const serverOptions = {
    endpoint : ENDPOINT,
    puppet   : puppet,
    token    : TOKEN,
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

  const puppetService = new PuppetService(puppetOptions)
  await puppetService.start()

  t.ok(spyStart.called, 'should called the puppet server start() function')

  const future = new Promise<string>((resolve, reject) => {
    const offError = () => puppetService.off('error', reject)

    puppetService.once('dong', payload => {
      resolve(payload.data)
      offError()
    })
    puppetService.once('error', e => {
      reject(e)
      offError()
    })
  })

  puppetService.ding(DING)
  const result = await future

  t.ok(spyOn.called,    'should called the puppet server on() function')
  t.ok(spyDing.called,  'should called the puppet server ding() function')

  t.equal(result, DING, 'should get a successful roundtrip for ding')

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
