import { test } from 'ava'

import * as https from 'https'
import * as sinon from 'sinon'

import {
  // PuppetWeb
  // , Message
  log
} from '../../'

import {
    // PuppetWeb
  Server
}               from '../../src/puppet-web/'

const PuppetWebServer = Server //require('../../src/puppet-web/server')
const PORT = 48788

test('PuppetWebServer basic tests', async t => {
  const s = new PuppetWebServer(PORT)
  t.is(typeof s, 'object', 'PuppetWebServer instance created')

  let httpsServer = null

  // co(function* () {
    const spy = sinon.spy()

    const express = s.createExpress()
    t.is(typeof express, 'function', 'create express')

    httpsServer = await s.createHttpsServer(express)
    t.is(typeof httpsServer, 'object', 'create https server')
    httpsServer.on('close', _ => spy('onClose'))

    const socketio = s.createSocketIo(httpsServer)
    t.is(typeof socketio, 'object', 'should created socket io instance')

    const retClose = await new Promise((resolve, reject) => {
      httpsServer.close(_ => {
        spy('closed')
        resolve('closed')
      })
    })
    t.is(retClose, 'closed',  'HttpsServer closed')

    t.truthy(spy.calledTwice, 'spy should be called twice after close HttpsServer')
    t.deepEqual(spy.args[0], ['onClose'], 'should fire event `close` when close HttpsServer')
    t.deepEqual(spy.args[1], ['closed']  , 'should run callback when close HttpsServer')

    await s.quit()
  // })
  // .catch(e => { // Reject
  //   t.fail('co promise rejected:' + e)
  // })
  // .then(() => { // Finally
  //   s.quit()
  //     .then(_ => t.end())
  // })
  // .catch(e => { // Exception
  //   t.fail('Exception:' + e)
  // })
})

test('PuppetWebServer smoke testing', async t => {
  const server = new Server(PORT)
  t.truthy(server, 'new server instance')

  // co(function* () {
    const retInit = await server.init()
    t.truthy(retInit, 'server:' + PORT + ' inited')

    const retHttps = await dingHttps()
    t.is(retHttps ,  'dong', 'ding https   got dong')

    await server.quit()
  // }).catch(e => { // Reject
  //   t.fail('co rejected:' + e)
  // }).then(() => { // Finally
  //   server.quit()
  //   t.end()
  // })
  // .catch(e => { // Exception
  //   t.fail('Exception:' + e)
  // })

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
