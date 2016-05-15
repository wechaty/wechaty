const co = require('co')
const log = require('npmlog')
const test = require('tape')
const PuppetWeb = require('../src/puppet-web')
const PORT = 58788
const HEAD = true

test('PuppetWeb smoke testing', function(t) {
  const pw = new PuppetWeb({head: HEAD, port: PORT})

  co(function* () {
    yield pw.init()
    t.pass('pw full inited')

    t.equal(pw.isLogined() , false  , 'instance not logined')
    pw.emit('login')
    t.equal(pw.isLogined() , true   , 'logined after login event')
    pw.emit('logout')
    t.equal(pw.isLogined() , false  , 'logouted after logout event')

    const retDing = yield pw.proxyWechaty('ding')
    t.equal(retDing, 'dong', 'Wechaty.ding()')

    const retCode = yield pw.proxyWechaty('getLoginStatusCode')
    t.equal(typeof retCode, 'number', 'getLoginStatusCode')
  })
  .catch(e => t.fail(e))
  .then(r => {
    pw.quit()
    t.end()
  })
})

test('Puppet Web server/browser communication', function(t) {
  const pw = new PuppetWeb({head: HEAD, port: PORT})

  co(function* () {
    yield pw.init()
    t.pass('pw full inited')

    const retSocket = yield dingSocket(pw.server)
    t.equal(retSocket,  'dong', 'dingSocket got dong')
  })
  .catch(e => { // Reject
    t.fail('co promise rejected:' + e)
  })
  .then(r => {  // Finally
    pw.quit()
    t.end()
  })
  .catch(e => { // Exception
    log.error('TestingPuppetWeb', 'Exception:' + e)
  })

  return // The following is help functions only

  //////////////////////////////////////////

  function dingSocket(server) {
    const maxTime   = 9000
    const waitTime  = 500
    let   totalTime = 0
    return new Promise((resolve, reject) => {
      setTimeout(testDing, waitTime)
      return

      function testDing() {
        //log.silly('TestingPuppetWebServer', server.socketio)
        if (!server.socketClient) {
          totalTime += waitTime
          if (totalTime > maxTime) {
            return reject('timeout after ' + totalTime + 'ms')
          }

          log.verbose('TestingPuppetWeb', 'waiting socketClient to connect for ' + totalTime + '/' + maxTime + ' ms...')
          setTimeout(testDing, waitTime)
          return
        }
        //log.silly('TestingPuppetWebServer', server.socketClient)
        server.socketClient.on('dong', data => {
          log.verbose('TestingPuppetWeb', 'socket recv event dong: ' + data)
          return resolve(data)
        })
        server.socketClient.emit('ding')
      }
    })
  }
})
