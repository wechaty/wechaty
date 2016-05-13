const https = require('https')
const log   = require('npmlog')
const test  = require('tape')
const co    = require('co')
const Server = require('../src/puppet-web-server')

test('Server basic tests', function(t) {
  //t.plan(9)

  const PORT = 58788
  const s = new Server({port: PORT})
  t.equal(typeof s      , 'object', 'Server instance created')

  const express = s.createExpress()
  t.equal(typeof express, 'function', 'create express')
  delete express

  const server = s.createHttpsServer(express)
  t.equal(typeof server, 'object', 'create server')
  server.on('close', () => t.ok(true, 'HttpsServer quited'))
  server.close(() => t.ok(true, 'HttpsServer closed'))
  delete server

  const socketio = s.createSocketIo()
  t.equal(typeof socketio, 'object', 'create socket io')
  delete socketio

  t.equal(s.isLogined() , false  , 'instance not logined')
  s.emit('login')
  t.equal(s.isLogined() , true   , 'logined after login event')
  s.emit('logout')
  t.equal(s.isLogined() , false  , 'logouted after logout event')

  s.quit() + t.end()
})

test('Server smoke testing', function(t) {
  const PORT = 58788
  const server = new Server({port: PORT})

  co(function* () {
    yield server.init()
    t.ok(true, 'server:' + PORT + ' inited')

    const retHttps = yield dingHttps()
    t.equal(retHttps ,  'dong', 'ding https   got dong')

    const retSocket = yield dingSocket()
    t.equal(retSocket,  'dong', 'ding socket  got dong')

    const retBrowser = yield dingBrowser()
    t.equal(retBrowser, 'dong', 'ding browser got dong')

    const retProxy = yield dingProxy()
    t.equal(retProxy,   'dong', 'ding proxy   got dong')

    const retStatus = yield getLoginStatusCode()
    // XXX sometimes object? 201605
    t.equal(typeof retStatus, 'number', 'status is number')
  }).catch(e => {
    t.fail('server init promise rejected:' + e)
  })

  server.quit()
  return t.end()

  function dingHttps() {
    const options = require('url').parse(`https://localhost:${PORT}/ding`)
    options.rejectUnauthorized = false // permit self-signed CA

    return new Promise((resolve, reject) => {
      https.get(options, res => {
        res.on('data', chunk => {
          log.verbose('TestingServer', 'https on data got: ' + chunk.toString())
          resolve(chunk.toString())
        })
      }).on('error', e => reject('https get error:' + e))
    })
  }

  function dingSocket() {
    const maxTime   = 3000
    const waitTime  = 500
    let   totalTime = 0
    return new Promise((resolve, reject) => {
      setTimeout(testDing, waitTime)

      function testDing() {
        log.silly('TestingServer', server.socketio)
        if (!server.socketClient) {
          totalTime += waitTime
          if (totalTime > maxTime) {
            return reject('timeout after ' + totalTime + 'ms')
          }

          log.verbose('TestingServer', 'waiting socketClient to connect for ' + totalTime + '/' + maxTime + ' ms...')
          setTimeout(testDing, waitTime)
          return
        }
        log.silly('TestingServer', server.socketClient)
        server.socketClient.on('dong', data => {
          log.verbose('TestingServer', 'socket on dong got: ' + data)
          resolve(data)
        })
        server.socketClient.emit('ding')
        server.socketClient.emit('ding')
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

