/**
 * Connection tests between `GrpcManager` and a `PuppetServer` serving a
 * `PuppetMock`: TLS with a valid token works; a client with mismatched TLS
 * options (TLS disabled against a TLS server) and a client with the wrong
 * token cannot connect.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  type PuppetOptions,
  log,
}                 from 'wechaty-puppet'
import PuppetMock from 'wechaty-puppet-mock'
import { freePort } from '../fixtures/free-port.ts'

import { GrpcManager }   from '../../src/client/grpc-manager.ts'
import {
  PuppetServer,
  type PuppetServerOptions,
}                       from '../../src/mod.ts'

const NIL_UUID_V4 = '00000000-0000-0000-0000-000000000000'

test('GrpcClient with TLS and valid token', async _t => {
  const PORT          = await freePort()
  const TOKEN         = `insecure_${NIL_UUID_V4}`
  const ENDPOINT      = `0.0.0.0:${PORT}`

  /**
   * Puppet Server
   */
  const serverOptions = {
    endpoint : ENDPOINT,
    puppet   : new PuppetMock(),
    token    : TOKEN,
  } as PuppetServerOptions

  const puppetServer = new PuppetServer(serverOptions)
  await puppetServer.start()

  /**
   * Puppet Service Client
   */
  const puppetOptions = {
    endpoint : ENDPOINT,
    token    : TOKEN,
  } as PuppetOptions

  const validTokenPuppet = new GrpcManager(puppetOptions)

  try {
    await validTokenPuppet.start()
    assert.ok(true, 'should work with TLS and valid token')
  } catch (e) {
    console.error(e)
    assert.fail('should not reject for a valid token & tls')
  } finally {
    try { await validTokenPuppet.stop() } catch (_) {}
  }

  await puppetServer.stop()
})

test('GrpcClient with invalid TLS options', async _t => {
  const PORT     = await freePort()
  const TOKEN    = `uuid_${NIL_UUID_V4}`
  const ENDPOINT = `0.0.0.0:${PORT}`

  /**
   * Puppet Server
   */
  const serverOptions = {
    endpoint : ENDPOINT,
    puppet   : new PuppetMock(),
    token    : TOKEN,
  } as PuppetServerOptions

  const puppetServer = new PuppetServer(serverOptions)
  await puppetServer.start()

  /**
   * Grpc Client
   */
  const puppetOptions: PuppetOptions = {
    endpoint    : ENDPOINT,
    tls: {
      disable : true,
    },
    token       : TOKEN,
  }

  const grpcClient = new GrpcManager(puppetOptions)
  grpcClient.on('error', e => console.info('###noTlsPuppet.on(error):', e))

  // Disable error log
  const level = log.level()
  log.level('silent')

  // assert.rejects, not assert.fail inside try: a catch would swallow the
  // failure and let a regression pass.
  try {
    await assert.rejects(grpcClient.start(), 'should throw for non-tls client to tls-server with noTlsInsecure: true')
  } finally {
    log.level(level)
    try { await grpcClient.stop() } catch (_) {}
  }

  await puppetServer.stop()
})

test('GrpcClient with invalid token', async _t => {
  const PORT     = await freePort()
  const endpoint = `0.0.0.0:${PORT}`

  /**
   * Puppet Server
   */
  const serverOptions = {
    endpoint,
    puppet: new PuppetMock(),
    token: 'insecure_UUIDv4',
  } as PuppetServerOptions

  const puppetServer = new PuppetServer(serverOptions)
  await puppetServer.start()

  /**
   * Puppet Service Client
   */
  const puppetOptions = {
    endpoint,
    /**
     * Put a random token for invalid the client token
     *  https://stackoverflow.com/a/8084248/1123955
     */
    token: 'insecure_' + Math.random().toString(36),
  } as PuppetOptions

  const invalidTokenPuppet = new GrpcManager(puppetOptions)

  try {
    await assert.rejects(invalidTokenPuppet.start(), 'should throw for invalid random token')
  } finally {
    try { await invalidTokenPuppet.stop() } catch (_) {}
  }

  await puppetServer.stop()
})
