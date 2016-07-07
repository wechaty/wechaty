const https = require('https')
const test  = require('tap').test
const co    = require('co')

const log = require('../../src/npmlog-env')

const PuppetWebServer = require('../../src/puppet-web/server')
const PORT = 58788

test('PuppetWebServer basic tests', function(t) {
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
  })
  .catch(e => { // Reject
    t.fail('co promise rejected:' + e)
  })
  .then(() => { // Finally
    s.quit()
    t.end()
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
