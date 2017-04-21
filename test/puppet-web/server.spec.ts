/**
 * Wechaty - Wechat for Bot. Connecting ChatBots
 *
 * Licenst: ISC
 * https://github.com/wechaty/wechaty
 *
 */
import { test }     from 'ava'

import * as https   from 'https'
import * as sinon   from 'sinon'

import { Server }   from '../../src/puppet-web/'
import UtilLib      from '../../src/util-lib'
import log          from '../../src/brolog-env'

test('create & close', async t => {
  const port = await UtilLib.getPort(18788)
  const s = new Server(port)
  t.is(typeof s, 'object', 'PuppetWebServer instance created')

  let httpsServer: https.Server

  const spy = sinon.spy()

  const express = s.createExpress()
  t.is(typeof express, 'function', 'create express')

  httpsServer = await s.createHttpsServer(express)
  t.is(typeof httpsServer, 'object', 'create https server')
  httpsServer.on('close', _ => spy('onClose'))

  const socketio = s.createSocketIo(httpsServer)
  t.is(typeof socketio, 'object', 'should created socket io instance')

  const retClose = await new Promise((resolve, reject) => {
    ; (httpsServer as any).close(_ => {
      spy('closed')
      resolve('closed')
    })
  })
  t.is(retClose, 'closed',  'HttpsServer closed')

  t.truthy(spy.calledTwice, 'spy should be called twice after close HttpsServer')
  t.deepEqual(spy.args[0], ['onClose'], 'should fire event `close` when close HttpsServer')
  t.deepEqual(spy.args[1], ['closed']  , 'should run callback when close HttpsServer')

  await s.quit()
})

test('http ding', async t => {
  const port = await UtilLib.getPort(18788)

  const server = new Server(port)
  t.truthy(server, 'new server instance')

  try {
    await server.init()
    t.pass('server:' + port + ' inited')

    const retHttps = await dingHttps()
    t.is(retHttps ,  'dong', 'ding https got dong')

    await server.quit()

  } catch (e) {
    t.fail('smoke testing exception: ' + e.message)
    throw e
  }

  return // The following is help functions only

  //////////////////////////////////////////

  function dingHttps() {
    const options = require('url').parse(`https://localhost:${port}/ding`)
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
