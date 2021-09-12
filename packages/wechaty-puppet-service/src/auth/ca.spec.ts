#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
}         from 'tstest'

import https from 'https'

import * as envVar  from './env-vars.js'
import type { AddressInfo } from 'ws'

import {
  TLS_CA_CERT,
  TLS_INSECURE_SERVER_CERT_COMMON_NAME,
  TLS_INSECURE_SERVER_CERT,
  TLS_INSECURE_SERVER_KEY,
}                                         from './ca.js'

test('CA smoke testing', async t => {

  const ca   = envVar.WECHATY_PUPPET_SERVICE_TLS_CA_CERT() || TLS_CA_CERT
  const cert = envVar.WECHATY_PUPPET_SERVICE_TLS_SERVER_CERT() || TLS_INSECURE_SERVER_CERT
  const key  = envVar.WECHATY_PUPPET_SERVICE_TLS_SERVER_KEY() || TLS_INSECURE_SERVER_KEY

  const server = https.createServer({
    cert,
    key,
  })

  const ALIVE = 'Alive!\n'

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
      servername: TLS_INSECURE_SERVER_CERT_COMMON_NAME,
    }, res => {
      res.on('data', chunk => resolve(chunk.toString()))
      res.on('error', reject)
    }).end()
  })
  server.close()

  t.equal(reply, ALIVE, 'should get https server reply')
})

test('CA SNI tests', async t => {

  const ca   = envVar.WECHATY_PUPPET_SERVICE_TLS_CA_CERT()      || TLS_CA_CERT
  const cert = envVar.WECHATY_PUPPET_SERVICE_TLS_SERVER_CERT()  || TLS_INSECURE_SERVER_CERT
  const key  = envVar.WECHATY_PUPPET_SERVICE_TLS_SERVER_KEY()   || TLS_INSECURE_SERVER_KEY

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
      TLS_INSECURE_SERVER_CERT_COMMON_NAME,
      true,
    ],
    [
      'invalid-sni',
      false,
      "Hostname/IP does not match certificate's altnames: Host: invalid-sni. is not cert's CN: insecure",
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
