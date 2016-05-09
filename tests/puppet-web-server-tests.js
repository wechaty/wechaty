const https = require('https')
const log   = require('npmlog')
const test  = require('tape')
const Server = require('../src/puppet-web-server')

test('Server basic tests', function (t) {
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

test('Server smoke testing', function (t) {
  const PORT = 58788
  const server = new Server({port: PORT})

  server.init()
  .then(() => {
    t.ok(true, 'server:' + PORT + ' inited')

    Promise.all([
      dingHttps()     // retHttps
      , dingSocket()  // retSocket
      , dingBrowser() // retBrowser
      , dingProxy()   // retProxy
      , getLoginStatusCode() // retStatus
    ]).then(([
      retHttps
      , retSocket
      , retBrowser
      , retProxy
      , retStatus
    ]) => {
      t.equal(retHttps ,  'dong', 'ding https   got dong')
      t.equal(retSocket,  'dong', 'ding socket  got dong')
      t.equal(retBrowser, 'dong', 'ding browser got dong')
      t.equal(retProxy,   'dong', 'ding proxy   got dong')

      // XXX sometimes object? 201605
      t.equal(typeof retStatus, 'number', 'status is number')

      t.end() + server.quit()
    }).catch(e => {
      t.fail('ding promise rejected:' + e)
      t.end() + server.quit()
    })

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
          //log.verbose('TestingServer', server.socketio)
          if (!server.socketClient) {
            totalTime += waitTime
            if (totalTime > maxTime) 
              return reject('timeout after ' + totalTime + 'ms');

            log.verbose('TestingServer', 'waiting socketClient to connect for ' + totalTime + '/' + maxTime + ' ms...')
            setTimeout(testDing, waitTime)
            return
          }
          //log.verbose('TestingServer', server.socketClient)
          server.socketClient.on  ('dong', data => {
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

  }).catch((e) => {
    t.fail('server init promise rejected:' + e)
  })
})

