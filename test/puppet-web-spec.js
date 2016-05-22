const co = require('co')
const test = require('tap').test
const log = require('npmlog')
// log.level = 'silly'

const PuppetWeb = require('../src/puppet-web')
const PORT = 58788

false && test('PuppetWeb smoke testing', function(t) {
    let pw
    co(function* () {
      pw = new PuppetWeb({port: PORT})
      t.ok(pw, 'new PuppetWeb')

      yield pw.init()
      t.pass('pw full inited')
      t.equal(pw.isLogined() , false  , 'instance not logined')

      // XXX find a better way to mock...
      pw.bridge.getUserName = function () { return Promise.resolve('mockedUserName') }

      const p1 = new Promise((resolve) => {
        pw.once('login', r => {
          t.equal(pw.isLogined() , true   , 'logined after login event')
          resolve()
        })
      })
      pw.server.emit('login')
      yield p1

      const p2 = new Promise((resolve) => {
        pw.once('logout', r => {
          t.equal(pw.isLogined() , false  , 'logouted after logout event')
          resolve()
        })
      })
      pw.server.emit('logout')
      yield p2

    })
    .catch(e => t.fail(e))  // Reject
    .then(r => {            // Finally
      pw.quit()
      t.end()
    })
    .catch(e => t.fail(e))   // Exception
})

test('Puppet Web server/browser communication', function(t) {
  let pw2
  co(function* () {
    pw2 = new PuppetWeb({port: PORT})
    t.ok(pw2, 'new PuppetWeb')

    yield pw2.init()
    t.pass('pw2 inited')

    const retSocket = yield dingSocket(pw2.server)
    t.equal(retSocket,  'dong', 'dingSocket got dong')

  })
  .catch(e => t.fail(e))      // Reject
  .then(r => {                // Finally
    pw2.quit()
    t.end()
  })
  .catch(e => { t.fail(e) })  // Exception

  return // The following is help functions only
  //////////////////////////////////////////////

  function dingSocket(server) {
    const maxTime   = 9000
    const waitTime  = 500
    let   totalTime = 0
    return new Promise((resolve, reject) => {
      log.verbose('TestingPuppetWeb', 'dingSocket()')
      return testDing()

      function testDing() {
        // log.silly('TestingPuppetWeb', server.socketio)
        if (!server.socketClient) {
          totalTime += waitTime
          if (totalTime > maxTime) {
            return reject('timeout after ' + totalTime + 'ms')
          }

          log.silly('TestingPuppetWeb', 'waiting socketClient to connect for ' + totalTime + '/' + maxTime + ' ms...')
          setTimeout(testDing, waitTime)
          return
        }
        //log.silly('TestingPuppetWebServer', server.socketClient)
        server.socketClient.once('dong', data => {
          log.verbose('TestingPuppetWeb', 'socket recv event dong: ' + data)
          return resolve(data)
        })
        server.socketClient.emit('ding')
      }
    })
  }
})
