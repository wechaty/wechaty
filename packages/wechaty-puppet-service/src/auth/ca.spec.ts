#!/usr/bin/env ts-node

import {
  test,
}         from 'tstest'

import https from 'https'

import * as envVar  from './env-vars'
import { AddressInfo } from 'ws'

test('CA smoke testing', async t => {

  const ca   = envVar.WECHATY_PUPPET_SERVICE_SSL_ROOT_CERT()
  const cert = envVar.WECHATY_PUPPET_SERVICE_SSL_SERVER_CERT()
  const key  = envVar.WECHATY_PUPPET_SERVICE_SSL_SERVER_KEY()

  const server = https.createServer({
    cert,
    key,
  })

  const ALIVE = 'Alive!\n'
  const SNI = 'wechaty-puppet-service'

  server.on('request', (_req, res) => {
    res.writeHead(200)
    res.end(ALIVE)
  })

  server.listen()
  const port = (server.address() as AddressInfo).port

  const reply = await new Promise((resolve, reject) => {
    https.request({
      ca,
      hostname: '127.0.0.1',
      method: 'GET',
      path: '/',
      port,
      servername: SNI,
    }, res => {
      res.on('data', chunk => resolve(chunk.toString()))
      res.on('error', reject)
    }).end()
  })
  server.close()

  t.equal(reply, ALIVE, 'should get https server reply')
})

test('CA SNI tests', async t => {

  const ca   = envVar.WECHATY_PUPPET_SERVICE_SSL_ROOT_CERT()
  const cert = envVar.WECHATY_PUPPET_SERVICE_SSL_SERVER_CERT()
  const key  = envVar.WECHATY_PUPPET_SERVICE_SSL_SERVER_KEY()

  const server = https.createServer({
    cert,
    key,
  })

  server.on('request', (_req, res) => {
    res.writeHead(200)
    res.end(ALIVE)
  })

  server.listen()
  const port = (server.address() as AddressInfo).port

  const ALIVE = 'Alive!\n'
  const SNI_TEST_LIST = [
    [
      'wechaty-puppet-service',
      true,
    ],
    [
      'invalid-sni',
      false,
      "Hostname/IP does not match certificate's altnames: Host: invalid-sni. is not cert's CN: wechaty-puppet-service",
    ],
  ] as const

  for (const [SNI, EXPECT, MSG] of SNI_TEST_LIST) {
    const result = await new Promise((resolve, reject) => {
      https.request({
        ca,
        hostname: '127.0.0.1',
        method: 'GET',
        path: '/',
        port,
        servername: SNI,
      }, res => {
        res.on('data', chunk => resolve(chunk.toString() === ALIVE))
        res.on('error', reject)
      })
        .on('error', e => {
          // console.info(e.message)
          t.equal(e.message, MSG, 'should get the error for invalid SNI: ' + SNI)
          resolve(false)
        })
        .end()

    })

    t.equal(result, EXPECT, 'should check the SNI: ' + SNI)
  }

  server.close()
})
