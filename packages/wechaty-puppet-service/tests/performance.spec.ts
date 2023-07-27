#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

/**
 * Software performance testing
 *  https://en.wikipedia.org/wiki/Software_performance_testing#Testing_types
 *
 * 负载测试，并发测试和压力测试，这三者之前的区别和联系？
 *  https://www.zhihu.com/question/269215477/answer/350162604
 *
 * NodeJS: How Is Logging Enabled for the @grpc/grpc.js Package
 *  https://stackoverflow.com/a/60935367/1123955
 *    GRPC_VERBOSITY=DEBUG GRPC_TRACE=all
 */

import {
  test,
  sinon,
}             from 'tstest'

import * as PUPPET from 'wechaty-puppet'

import {
  PuppetMock,
}                         from 'wechaty-puppet-mock'

import {
  PuppetService,
  PuppetServer,
  PuppetServerOptions,
}                               from '../src/mod.js'

import { log } from '../src/config.js'

const idToName = (id: string) => {
  return `name of ${id}`
}

class PuppetTest extends PuppetMock {

  constructor (...args: any[]) {
    super(...args)
  }

  override async contactRawPayload (id: string): Promise<PUPPET.payloads.Contact> {
    log.verbose('PuppetTest', 'contactRawPayload(%s)', id)
    const rawPayload: PUPPET.payloads.Contact = {
      avatar : '',
      gender : PUPPET.types.ContactGender.Male,
      id,
      name : idToName(id),
      phone: [],
      type   : PUPPET.types.Contact.Individual,
    }

    await new Promise<void>(resolve => {
      process.stdout.write(',')
      setTimeout(() => {
        process.stdout.write('.')
        resolve()
      }, 1000)
    })

    return rawPayload
  }

}

test.skip('stress testing', async t => {
  const TOKEN    = 'test_token'
  const ENDPOINT = '0.0.0.0:8788'
  // const DING     = 'ding_data'

  /**
   * Puppet in Service
   */
  const puppet = new PuppetTest()
  const spy = sinon.spy(puppet, 'contactRawPayload')

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
  } as PUPPET.PuppetOptions

  const puppetService = new PuppetService(puppetOptions)
  await puppetService.start()

  let COUNTER = 0
  const dongList: string[] = []
  puppetService.on('dong', payload => {
    dongList.push(payload.data || '')
  })

  const timer = setInterval(() => {
    puppetService.ding(`interval ${COUNTER++}`)
  }, 10)

  const CONCURRENCY = 1000
  const concurrencyList = [
    ...Array(CONCURRENCY).keys(),
  ].map(String)

  const resultList = await Promise.all(
    concurrencyList.map(
      id => puppetService.contactPayload(id),
    ),
  )
  console.info()

  clearInterval(timer)

  const actualNameList       = resultList.map(payload => payload.name)
  const EXPECTED_RESULT_LIST = concurrencyList.map(idToName)

  t.equal(spy.callCount, CONCURRENCY, `should be called ${CONCURRENCY} times`)
  t.same(actualNameList, EXPECTED_RESULT_LIST, `should get the right result with a huge concurrency ${CONCURRENCY}`)

  t.ok(dongList.length > 10, `dongList should receive many dong data (actual: ${dongList.length})`)
  t.equal(dongList[0], 'interval 0', 'dongList should get the first response from counter 0')

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
