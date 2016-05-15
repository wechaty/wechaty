const https = require('https')
const test  = require('tape')
const co    = require('co')
const log   = require('npmlog')
log.level = 'silly'

const PuppetWebServer = require('../src/puppet-web-server')

test('PuppetWebServer basic tests', function(t) {
  const PORT = 58788
  const s = new PuppetWebServer({port: PORT})
  t.equal(typeof s, 'object', 'PuppetWebServer instance created')

  co(function* () {
    const express = s.createExpress()
    t.equal(typeof express, 'function', 'create express')

    const httpsServer = s.createHttpsServer(express)
    t.equal(typeof httpsServer, 'object', 'create https server')
    httpsServer.on('close', () => t.pass('HttpsServer quited'))

    const retClose = yield new Promise((resolve, reject) => {
      httpsServer.close(() => resolve(true))
    })
    t.ok(retClose, 'HttpsServer closed')

    const socketio = s.createSocketIo()
    t.equal(typeof socketio, 'object', 'create socket io')

    t.equal(s.isLogined() , false  , 'instance not logined')
    s.emit('login')
    t.equal(s.isLogined() , true   , 'logined after login event')
    s.emit('logout')
    t.equal(s.isLogined() , false  , 'logouted after logout event')

  }).catch(e => { // Reject
    t.fail('co promise rejected:' + e)
  })
  .then(() => {   // Finally
    s.quit()
    t.end()
  })
})

test.only('PuppetWebServer smoke testing', function(t) {
  const PORT = 58788
  const server = new PuppetWebServer({port: PORT})

  co(function* () {
    const retInit = yield server.init()
    t.ok(retInit, 'server:' + PORT + ' inited')

    const retHttps = yield dingHttps()
    t.equal(retHttps ,  'dong', 'ding https   got dong')

    const retSocket = yield dingSocket()
    t.equal(retSocket,  'dong', 'ding socket  got dong')

    /*
    const retBrowser = yield dingBrowser()
    t.equal(retBrowser, 'dong', 'ding browser got dong')

    const retProxy = yield dingProxy()
    t.equal(retProxy,   'dong', 'ding proxy   got dong')

    const retStatus = yield getLoginStatusCode()
    t.equal(typeof retStatus, 'number', 'status is number') // XXX sometimes object? 201605
   */
  }).catch(e => { // Catch
    t.fail('co rejected:' + e)
  }).then(() => { // Finally
    server.quit()
    t.end()
  })

  return // The following is help functions only

  //////////////////////////////////////////

  function dingHttps() {
    const options = require('url').parse(`https://localhost:${PORT}/ding`)
    options.rejectUnauthorized = false // permit self-signed CA

    return new Promise((resolve, reject) => {
      https.get(options, res => {
        res.on('data', chunk => {
          log.verbose('TestingPuppetWebServer', 'https on data got: ' + chunk.toString())
          resolve(chunk.toString())
        })
      }).on('error', e => reject('https get error:' + e))
    })
  }

  function dingSocket() {
    const maxTime   = 9000
    const waitTime  = 500
    let   totalTime = 0
    return new Promise((resolve, reject) => {
      setTimeout(testDing, waitTime)

      function testDing() {
        //log.silly('TestingPuppetWebServer', server.socketio)
        if (!server.socketClient) {
          totalTime += waitTime
          if (totalTime > maxTime) {
            return reject('timeout after ' + totalTime + 'ms')
          }

          log.verbose('TestingPuppetWebServer', 'waiting socketClient to connect for ' + totalTime + '/' + maxTime + ' ms...')
          setTimeout(testDing, waitTime)
          return
        }
        //log.silly('TestingPuppetWebServer', server.socketClient)
        server.socketClient.on('dong', data => {
          log.verbose('TestingPuppetWebServer', 'socket on dong got: ' + data)
          return resolve(data)
        })
        server.socketClient.emit('ding')
      }
    })
  }

  function dingBrowser() {
    return server.browserExecute('return Wechaty.ding()')
  }

  function dingProxy() {
    return server.proxyWechaty('ding')
  }

  function getLoginStatusCode() {
    return server.proxyWechaty('getLoginStatusCode')
  }
})
