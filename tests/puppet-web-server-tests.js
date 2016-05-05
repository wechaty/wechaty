const https = require('https')

const test = require('tape')
const Server = require('../lib/puppet-web-server')

test('Server basic tests', function (t) {
  t.plan(9)

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

  s.quit()
  delete s
  //t.end()
})

test('Server smoking tests', function (t) {
  const PORT = 58788
  const s = new Server(PORT)

  t.plan(1)
  console.log(`s.init()`)
  s.init().then(() => {
    console.error('s.inited')
    
    const options = require('url').parse(`https://localhost:${PORT}/ping`)
    options.rejectUnauthorized = false // permit self-signed CA

    https.get(options, (res) => {
      console.error('server inited')

      res.on('data', chunk => {
        t.equal(chunk.toString(), 'pong', 'https get /ping return pong')
      })
    }).on('error', e => {
      console.error(e)
      t.ok(false, 'https get error')
    })

    s.socketClient.on('pong', (data) => {
      console.error('received event pong from socket: ' + data)
      t.equal(data, 'pong', 'socket io sent ping got pong')
    })
    s.socketClient.emit('ping')
  })
})

