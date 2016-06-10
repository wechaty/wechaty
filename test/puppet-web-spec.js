const co    = require('co')
const util  = require('util')
const test  = require('tap').test

const log = require('../src/npmlog-env')

const PORT = process.env.WECHATY_PORT || 58788
const HEAD = process.env.WECHATY_HEAD || false
const SESSION = 'unit-test-session.json'

const PuppetWeb = require('../src/puppet-web')

function dingSocket(server) {
  const maxTime   = 60000 // 60s
  const waitTime  = 500
  let   totalTime = 0
  return new Promise((resolve, reject) => {
    log.verbose('TestPuppetWeb', 'dingSocket()')
    return testDing()

    function testDing() {
      // log.silly('TestPuppetWeb', server.socketio)
      if (!server.socketClient) {
        totalTime += waitTime
        if (totalTime > maxTime) {
          return reject('timeout after ' + totalTime + 'ms')
        }

        log.silly('TestPuppetWeb', 'waiting socketClient to connect for ' + totalTime + '/' + maxTime + ' ms...')
        setTimeout(testDing, waitTime)
        return
      }
      //log.silly('TestPuppetWebServer', server.socketClient)
      server.socketClient.once('dong', data => {
        log.verbose('TestPuppetWeb', 'socket recv event dong: ' + data)
        return resolve(data)
      })
      server.socketClient.emit('ding')
    }
  })
}

test('PuppetWeb smoke testing', function(t) {
  let pw = new PuppetWeb({port: PORT, head: HEAD, session: SESSION})
  t.ok(pw, 'new PuppetWeb')

  co(function* () {
    yield pw.init()
    t.pass('pw full inited')
    t.equal(pw.logined() , false  , 'should be not logined')

    // XXX find a better way to mock...
    pw.bridge.getUserName = function() { return Promise.resolve('mockedUserName') }
    pw.getContact = function() { return Promise.resolve('dummy') }

    const p1 = new Promise((resolve) => {
      pw.once('login', r => {
        t.equal(pw.logined() , true   , 'should be logined after emit login event')
        resolve()
      })
    })
    pw.server.emit('login')
    yield p1

    const p2 = new Promise((resolve) => {
      pw.once('logout', r => {
        process.nextTick(() => { // wait to next tick for pw clean logined user status
          // log.verbose('TestPuppetWeb', 'on(logout) received %s, islogined: %s', r, pw.logined())
          t.equal(pw.logined() , false  , 'logouted after logout event')
          resolve()
        })
      })
    })
    pw.server.emit('logout')
    yield p2
  })
  .catch(e => t.fail(e))  // Reject
  .then(r => {            // Finally 1
    // log.warn('TestPuppetWeb', 'finally()')
    pw.quit()
    .then(t.end)
  })
  .catch(e => t.fail(e))  // Exception
})

test('Puppet Web server/browser communication', function(t) {
  let pw = new PuppetWeb({port: PORT, head: HEAD, session: SESSION})
  t.ok(pw, 'new PuppetWeb')

  co(function* () {
    yield pw.init()
    t.pass('pw inited')

    const retSocket = yield dingSocket(pw.server)
    t.equal(retSocket,  'dong', 'dingSocket got dong')
  })
  .catch(e => {               // Reject
    log.warn('TestPuppetWeb', 'error: %s', e)
    t.fail(e)
  })
  .then(r => {                // Finally
    pw.quit()
    .then(t.end)
  })
  .catch(e => { t.fail(e) })  // Exception
})

/*
false && test('Puppet Web promise version of server/browser communication', function(t) {
  pw = new PuppetWeb({port: PORT, head: HEAD, session: SESSION})
  t.ok(pw, 'new PuppetWeb')

  pw.init()
  .then(r => {
    t.pass('pw inited')

    return dingSocket(pw.server)
  })
  .then(retSocket => {
    t.equal(retSocket,  'dong', 'dingSocket got dong')
    return true
  })
  .catch(e => {               // Reject
    log.warn('TestPuppetWeb', 'error: %s', e)
    t.fail(e)
    throw e
  })
  .then(r => {                // Finally 1
    t.pass('dingSocket resolved')
    return pw.quit()
  })
  .then(r => {                // Finally 2
    t.pass('pw.quit() resolved')
    t.end()
  })
  .catch(e => {
    t.fail(e)
    throw e
  })  // Exception
})
*/
