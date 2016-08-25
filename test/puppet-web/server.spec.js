const https = require('https')
const test  = require('tape')
const sinon = require('sinon')
const co    = require('co')

const log = require('../../src/npmlog-env')

const PuppetWebServer = require('../../src/puppet-web/server')
const PORT = 48788

test('PuppetWebServer basic tests', function(t) {
  const s = new PuppetWebServer({port: PORT})
  t.equal(typeof s, 'object', 'PuppetWebServer instance created')

  let httpsServer = null

  co(function* () {
    const spy = sinon.spy()
    
    const express = s.createExpress()
    t.equal(typeof express, 'function', 'create express')

    httpsServer = s.createHttpsServer(express)
    t.equal(typeof httpsServer, 'object', 'create https server')
    httpsServer.on('close', _ => spy('onClose'))

    const socketio = s.createSocketIo(httpsServer)
    t.equal(typeof socketio, 'object', 'should created socket io instance')

    const retClose = yield new Promise((resolve, reject) => {
      httpsServer.close(_ => {
        spy('closed')
        resolve('closed')
      })
    })
    t.equal(retClose, 'closed',  'HttpsServer closed')

    t.ok(spy.calledTwice, 'spy should be called twice after close HttpsServer')
    t.deepEqual(spy.args[0], ['onClose'], 'should fire event `close` when close HttpsServer')
    t.deepEqual(spy.args[1], ['closed']  , 'should run callback when close HttpsServer')
  })
  .catch(e => { // Reject
    t.fail('co promise rejected:' + e)
  })
  .then(() => { // Finally
    s.quit()
      .then(_ => t.end())
  })
  .catch(e => { // Exception
    t.fail('Exception:' + e)
  })
})

test('PuppetWebServer smoke testing', function(t) {
  const server = new PuppetWebServer({port: PORT})
  t.ok(server, 'new server instance')

  co(function* () {
    const retInit = yield server.init()
    t.ok(retInit, 'server:' + PORT + ' inited')

    const retHttps = yield dingHttps()
    t.equal(retHttps ,  'dong', 'ding https   got dong')
  }).catch(e => { // Reject
    t.fail('co rejected:' + e)
  }).then(() => { // Finally
    server.quit()
    t.end()
  })
  .catch(e => { // Exception
    t.fail('Exception:' + e)
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
})
