const https = require('https')

const test = require('tape')
const Server = require('../lib/puppet-web-server')

test('Server basic tests', function (t) {
  //t.plan(9)

  const PORT = 58788
  const s = new Server(PORT)
  t.equal(typeof s      , 'object', 'Server instance created')

  const express = s.createExpress()
  t.equal(typeof express, 'function', 'create express')
  delete express

  const server = s.createHttpsServer(express, PORT)
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

test('Server smoking tests', function (t) {
  const PORT = 58788
  const server = new Server(PORT)

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
            console.log('https on data got: ' + chunk.toString())
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
          if (!server.socketClient) {
            totalTime += waitTime
            if (totalTime > maxTime) 
              return reject('timeout after ' + totalTime + 'ms');

            console.error('waiting socketClient to connect for ' + totalTime + '/' + maxTime + ' ms...')
            setTimeout(testDing, waitTime)
            return
          }
          server.socketClient.on  ('dong', data => {
            console.log('socket on dong got: ' + data)
            resolve(data)
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
      return server.Wechaty_getLoginStatusCode()
    }

  }).catch((e) => {
    t.fail('server init promise rejected:' + e)
  })
})

