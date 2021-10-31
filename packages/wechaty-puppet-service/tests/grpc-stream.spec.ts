#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/**
 * @hcfw007, https://wechaty.js.org/contributors/wang-nan/
 * related issue: attempt to reconnect gRPC after disconnection
 * Scenario: the watchdog tries to restart the service but failed due to the existence of eventstream
 * Caused by the grpcClient set to undefined (still working on why this happens) while eventstream still working
 * issue: #172, https://github.com/wechaty/puppet-service/issues/172
 *
 * NodeJS: How Is Logging Enabled for the @grpc/grpc.js Package
 *  https://stackoverflow.com/a/60935367/1123955
 *    GRPC_VERBOSITY=DEBUG GRPC_TRACE=all
 */

import {
  test,
  sinon,
}                             from 'tstest'
import type {
  PuppetOptions,
}                             from 'wechaty-puppet'
import {
  PuppetMock,
}                             from 'wechaty-puppet-mock'
import getPort                from 'get-port'

import {
  PuppetService,
  PuppetServer,
  PuppetServerOptions,
}                             from '../src/mod.js'

test('Close eventStream when gRPC breaks', async t => {
  /**
   * Huan(202110):
   * `insecure_` prefix is required for the TLS version of Puppet Service
   *  because the `insecure` will be the SNI name of the Puppet Service
   *  and it will be enforced for the security (required by TLS)
   */
  const TOKEN       = 'insecure_token'
  const PORT        = await getPort()
  const ENDPOINT    = '0.0.0.0:' + PORT

  const puppet = new PuppetMock()
  const spyOnStart = sinon.spy(puppet, 'onStart')
  /**
   * Puppet Server
   */
  const serverOptions = {
    endpoint: ENDPOINT,
    puppet: puppet,
    token: TOKEN,
  } as PuppetServerOptions

  const puppetServer = new PuppetServer(serverOptions)
  await puppetServer.start()

  /**
   * Puppet Service Client
   */
  const puppetOptions = {
    endpoint: ENDPOINT,
    token: TOKEN,
  } as PuppetOptions

  const puppetService = new PuppetService(puppetOptions)
  await puppetService.start()
  t.ok(spyOnStart.called, 'should called the puppet server onStart() function')

  puppetService.on('error', console.error)

  // mock grpcClient break
  await puppetService.grpc.client.close()
  await puppetService.stop()

  // get eventStream status
  t.throws(() => puppetService.grpc, 'should clean grpc after stop()')

  await puppetServer.stop()
})
