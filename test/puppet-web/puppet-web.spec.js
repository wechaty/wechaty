import { test } from 'ava'

import {
  PuppetWeb
  , Message
  , log
} from '../../'

import util from 'util'
import retryPormise from 'retry-promise'
import EventEmitter from 'events'

import { spy } from 'sinon'

// const co    = require('co')
// const util  = require('util')
// const test  = require('tape')
// const retryPromise = require('retry-promise').default

// const log = require('../../src/npmlog-env')

// const PROFILE = 'unit-test-session.wechaty.json'

// const PuppetWeb = require('../../src/puppet-web')
// const Message = require('../../src/message')

test('Puppet Web Self Message Identification', t => {
  const p = new PuppetWeb({profile: PROFILE})
  t.truthy(p, 'should instantiated a PuppetWeb')

  const EXPECTED_USER_ID = 'zixia'
  const m = new Message()
  m.set('from', EXPECTED_USER_ID)
  p.userId = EXPECTED_USER_ID
  t.truthy(p.self(m), 'should identified self for message which from is self')

  // t.end()
})

test('PuppetWeb login/logout events', async t => {
  let pw = new PuppetWeb()
  t.truthy(pw, 'should instantiated a PuppetWeb')

  await pw.init()
  t.pass('should be inited')
  t.is(pw.logined() , false  , 'should be not logined')

  // XXX find a better way to mock...
  pw.bridge.getUserName = function() { return Promise.resolve('mockedUserName') }
  pw.getContact = function() { return Promise.resolve('dummy') }

  const loginPromise = new Promise((res,rej) => pw.once('login', _ => res('loginFired')))
  pw.server.emit('login')
  t.is(await loginPromise, 'loginFired', 'should fired login event')
  t.is(pw.logined(), true  , 'should be logined')

  const logoutPromise = new Promise((res,rej) => pw.once('logout', _ => res('logoutFired')))
  pw.server.emit('logout')
  t.is(await logoutPromise, 'logoutFired', 'should fire logout event')
  t.is(pw.logined(), false, 'should be logouted')

  await pw.quit()
})

test('PuppetWeb server/browser communication', async t => {
  let pw = new PuppetWeb()
  t.truthy(pw, 'should instantiated a PuppetWeb')

  const EXPECTED_DING_DATA = 'dingdong'

  await pw.init()
  t.pass('should be inited')

  const ret = await dingSocket(pw.server)
  t.is(ret,  EXPECTED_DING_DATA, 'should got EXPECTED_DING_DATA after resolved dingSocket()')

  await pw.quit()

  return
  /////////////////////////////////////////////////////////////////////////////
  function dingSocket(server) {
    const maxTime   = 60000 // 60s
    const waitTime  = 3000
    let   totalTime = 0
    return new Promise((resolve, reject) => {
      log.verbose('TestPuppetWeb', 'dingSocket()')

      setTimeout(_ => {
        reject('no response timeout after ' + 2 * maxTime)
      }, 2 * maxTime)
      .unref()

      return testDing()

      function testDing() {
        log.silly('TestPuppetWeb', 'dingSocket() server.socketServer: %s', server.socketServer)
        if (!server.socketClient) {
          totalTime += waitTime
          if (totalTime > maxTime) {
            return reject('timeout after ' + totalTime + 'ms')
          }

          log.silly('TestPuppetWeb', 'waiting socketClient to connect for ' + totalTime + '/' + maxTime + ' ms...')
          setTimeout(testDing, waitTime)
          return
        }
        log.silly('TestPuppetWeb', 'dingSocket() server.socketClient: %s', server.socketClient)
        server.socketClient.once('dong', data => {
          log.verbose('TestPuppetWeb', 'socket recv event dong: ' + data)
          return resolve(data)
        })
        server.socketClient.emit('ding', EXPECTED_DING_DATA)
      }
    })
  }
})
