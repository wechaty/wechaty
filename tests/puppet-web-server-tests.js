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
    
    const options = require('url').parse(`https://localhost:${PORT}/ding`)
    options.rejectUnauthorized = false // permit self-signed CA

    https.get(options, (res) => {
      t.pass('https server inited')

      res.on('data', chunk => {
        t.equal(chunk.toString(), 'dong', 'https get /ding return dong')
      })
    }).on('error', e => {
      t.fail('https get error:' + e)
    })

    function testDing() {
      if (!server.socketClient) {
        console.error('waiting socketClient to connect for 500ms...')
        setTimeout(testDing, 500)
        return
      }
      server.socketClient.on('dong', (data) => {
        t.equal(data, 'dong', 'socket io sent ding got dong')

        server.quit()
        t.end()
      })
      server.socketClient.emit('ding')
    }
    testDing()

  }).catch((e) => {
    t.fail('server init promise rejected:' + e)
  })
  console.error('here')
})

