const https = require('https')

const test = require('tape')
const PuppetWeb = require('../lib/puppet-web')

const WebServer = PuppetWeb.WebServer

test('WebServer basic tests', function (t) {
  t.plan(9)

  const PORT = 58788
  const s = new WebServer()
  t.equal(typeof s      , 'object', 'WebServer instance created')

  const express = s.initExpress()
  t.equal(typeof express, 'function', 'init express')
  delete express

  const server = s.initHttpsServer(express, PORT)
  t.equal(typeof server, 'object', 'init server')
  server.on('close', () => t.ok(true, 'HttpsServer quited'))
  server.close(() => t.ok(true, 'HttpsServer closed'))
  delete server

  const socketio = s.initSocketIo()
  t.equal(typeof socketio, 'object', 'init socket io')
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

test('WebServer smoking tests', function (t) {
  const PORT = 58788
  const s = new WebServer()

  t.plan(1)
  console.log(`s.init(${PORT})`)
  s.init(PORT)

  const options = require('url').parse(`https://localhost:${PORT}/ping`)
  Object.assign(options, {rejectUnauthorized: false}) // permit self-signed CA

  https.get(options, (res) => {
    res.on('data', chunk => {
      t.equal(chunk.toString(), 'pong', 'https get /ping return pong')
    })
  }).on('error', e => {
    console.error(e)
    t.ok(false, 'https get fail')
  })

}) 

