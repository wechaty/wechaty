#!/usr/bin/env ts-node

/**
 * Software performance testing
 *  https://en.wikipedia.org/wiki/Software_performance_testing#Testing_types
 *
 * 负载测试，并发测试和压力测试，这三者之前的区别和联系？
 *  https://www.zhihu.com/question/269215477/answer/350162604
 */

import {
  test,
  sinon,
}             from 'tstest'

import {
  PuppetHostie,
  PuppetServer,
  PuppetServerOptions,
}                               from '../src'
import {
  PuppetOptions,
  ContactPayload,
  log,
  ContactGender,
  ContactType,
}                               from 'wechaty-puppet'

import {
  PuppetMock,
}                         from 'wechaty-puppet-mock'

const idToName = (id: string) => {
  return `name of ${id}`
}

class PuppetTest extends PuppetMock {

  constructor (...args: any[]) {
    super(...args)
  }

  public async contactRawPayload (id: string): Promise<ContactPayload> {
    log.verbose('PuppetTest', 'contactRawPayload(%s)', id)
    const rawPayload: ContactPayload = {
      avatar : '',
      gender : ContactGender.Male,
      id,
      name : idToName(id),
      type   : ContactType.Individual,
    }

    await new Promise(resolve => {
      process.stdout.write(',')
      setTimeout(() => {
        process.stdout.write('.')
        resolve()
      }, 1000)
    })

    return rawPayload
  }

}

test.skip('stress testing', async (t) => {
  const TOKEN    = 'test_token'
  const ENDPOINT = '0.0.0.0:8788'
  // const DING     = 'ding_data'

  /**
   * Puppet in Hostie
   */
  const puppet = new PuppetTest()
  const spy = sinon.spy(puppet, 'contactRawPayload')

  /**
   * Hostie Server
   */
  const serverOptions = {
    endpoint : ENDPOINT,
    puppet   : puppet,
    token    : TOKEN,
  } as PuppetServerOptions

  const hostieServer = new PuppetServer(serverOptions)
  await hostieServer.start()

  /**
   * Puppet Hostie Client
   */
  const puppetOptions = {
    endpoint : ENDPOINT,
    token    : TOKEN,
  } as PuppetOptions

  const puppetHostie = new PuppetHostie(puppetOptions)
  await puppetHostie.start()

  let COUNTER = 0
  const dongList: string[] = []
  puppetHostie.on('dong', payload => {
    dongList.push(payload.data)
  })

  const timer = setInterval(() => {
    puppetHostie.ding(`interval ${COUNTER++}`)
  }, 10)

  const CONCURRENCY = 1000
  const concurrencyList = [
    ...Array(CONCURRENCY).keys(),
  ].map(String)

  const resultList = await Promise.all(
    concurrencyList.map(
      id => puppetHostie.contactPayload(id)
    )
  )
  console.info()

  clearInterval(timer)

  const actualNameList       = resultList.map(payload => payload.name)
  const EXPECTED_RESULT_LIST = concurrencyList.map(idToName)

  t.equals(spy.callCount, CONCURRENCY, `should be called ${CONCURRENCY} times`)
  t.deepEqual(actualNameList, EXPECTED_RESULT_LIST, `should get the right result with a huge concurrency ${CONCURRENCY}`)

  t.ok(dongList.length > 10, `dongList should receive many dong data (actual: ${dongList.length})`)
  t.equal(dongList[0], 'interval 0', 'dongList should get the first response from counter 0')

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
