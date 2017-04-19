/**
 * Wechaty - Wechat for Bot. Connecting ChatBots
 *
 * Licenst: ISC
 * https://github.com/wechaty/wechaty
 *
 */
import { test } from 'ava'

import {
  Config,
  log,
}                     from '../../src/config'
// import { Message }    from '../../src/message'
import PuppetWeb  from '../../src/puppet-web'
import Server     from '../../src/puppet-web/server'

// import { spy } from 'sinon'

process.on('unhandledRejection', (reason, p) => {
  console.log('!!!!!!! unhandledRejection in puppet-web.spec.ts')
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason)
  console.log('!!!!!!!')
})

/**
 * the reason why use `test.serial` here is:
 *  static variable `Contact.puppet` will be changed
 *  when `PuppteWeb.init()` and `PuppteWeb.quit()`
 */
test.serial('login/logout events', async t => {
  let pw = new PuppetWeb()
  t.truthy(pw, 'should instantiated a PuppetWeb')

  Config.puppetInstance(pw)

  await pw.init()
  t.pass('should be inited')
  t.is(pw.logined() , false  , 'should be not logined')

  // XXX find a better way to mock...
  pw.bridge.getUserName = function() { return Promise.resolve('mockedUserName') }
  pw.getContact = function() { return Promise.resolve('dummy') }

  const loginPromise = new Promise((res, rej) => pw.once('login', _ => res('loginFired')))
  pw.server.emit('login')
  t.is(await loginPromise, 'loginFired', 'should fired login event')
  t.is(pw.logined(), true  , 'should be logined')

  const logoutPromise = new Promise((res, rej) => pw.once('logout', _ => res('logoutFired')))
  pw.server.emit('logout')
  t.is(await logoutPromise, 'logoutFired', 'should fire logout event')
  t.is(pw.logined(), false, 'should be logouted')

  await pw.quit()
})

test.serial('server/browser socketio ding', async t => {
  let pw = new PuppetWeb()
  t.truthy(pw, 'should instantiated a PuppetWeb')

  Config.puppetInstance(pw)

  const EXPECTED_DING_DATA = 'dingdong'

  try {
    await pw.init()
    t.pass('should be inited')

    const ret = await dingSocket(pw.server)
    t.is(ret, EXPECTED_DING_DATA, 'should got EXPECTED_DING_DATA after resolved dingSocket()')
  } catch (e) {
    t.fail(e && e.message || e || 'unknown exception???')
  }

  try {
    await pw.quit()
  } catch (err) {
    t.fail(err.message)
  }

  return

  /////////////////////////////////////////////////////////////////////////////

  function dingSocket(server: Server) {
    const maxTime   = 60000 // 60s
    const waitTime  = 3000
    let   totalTime = 0
    return new Promise((resolve, reject) => {
      log.verbose('TestPuppetWeb', 'dingSocket()')

      setTimeout(_ => {
        return reject('dingSocket() no response timeout after ' + 2 * maxTime)
      }, 2 * maxTime)
      .unref()

      testDing()
      return

      function testDing(): void {
        log.silly('TestPuppetWeb', 'dingSocket() server.socketServer: %s', server.socketServer)
        if (!server.socketClient) {
          totalTime += waitTime
          if (totalTime > maxTime) {
            return reject('testDing() timeout after ' + totalTime + 'ms')
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
