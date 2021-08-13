#!/usr/bin/env ts-node

import { test }  from 'tstest'
import { PuppetOptions } from 'wechaty-puppet'
import PuppetMock from 'wechaty-puppet-mock'

import { log } from '../src/config'

import { GrpcClient }   from '../src/client/grpc-client'
import {
  PuppetServer,
  PuppetServerOptions,
}                       from '../src/mod'

test('GrpcClient with invalid SSL options', async (t) => {
  const TOKEN    = '__test_token__'
  const ENDPOINT = '0.0.0.0:8788'

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
  const puppetOptions = {
    deprecatedNoSslUnsafe : true,
    endpoint              : ENDPOINT,
    token                 : TOKEN,
  } as PuppetOptions

  const grpcClient = new GrpcClient(puppetOptions)
  grpcClient.on('error', e => console.info('###noSslPuppet.on(error):', e))

  // Disable error log
  const level = log.level()
  log.level('silent')

  try {
    await grpcClient.start()
    t.fail('should throw for no-ssl client to ssl-server instead of not running to here')
  } catch (e) {
    t.pass('should throw for non-ssl client to ssl-server with deprecatedNoSslUnsafe: true')
  } finally {
    log.level(level)
    try { await grpcClient.stop() } catch (_) {}
  }

  await puppetServer.stop()
})

test('GrpcClient with invalid token', async (t) => {
  const TOKEN         = '__test_token__'
  const INVALID_TOKEN = '__invalid_token__'
  const ENDPOINT      = '0.0.0.0:8788'

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
    token    : INVALID_TOKEN,
  } as PuppetOptions

  const invalidTokenPuppet = new GrpcClient(puppetOptions)
  // invalidTokenPuppet.on('error', _ => {})

  try {
    await invalidTokenPuppet.start()
    t.fail('should throw for invalid token instead of not running to here')
  } catch (e) {
    t.pass('should throw for invalid token: ' + INVALID_TOKEN)
  } finally {
    try { await invalidTokenPuppet.stop() } catch (_) {}
  }

  await puppetServer.stop()
})
