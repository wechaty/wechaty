/**
 * Regression test for wechaty/puppet-service#172: when the gRPC client is
 * closed under a running `PuppetService`, stopping the service still works.
 */
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

import assert from 'node:assert/strict'
import { mock, test } from 'node:test'
import type {
  PuppetOptions,
}                             from 'wechaty-puppet'
import {
  PuppetMock,
}                             from 'wechaty-puppet-mock'
import { freePort } from '../fixtures/free-port.ts'
import { useTempHome } from '../fixtures/temp-home.ts'

import {
  PuppetService,
  PuppetServer,
  type PuppetServerOptions,
}                             from '../../src/mod.ts'

test('gRPC client breaks', async t => {
  useTempHome(t)
  /**
   * Huan(202110):
   * `insecure_` prefix is required for the TLS version of Puppet Service
   *  because the `insecure` will be the SNI name of the Puppet Service
   *  and it will be enforced for the security (required by TLS)
   */
  const TOKEN       = 'insecure_token'
  const PORT        = await freePort()
  const ENDPOINT    = '0.0.0.0:' + PORT

  const puppet = new PuppetMock()
  const spyOnStart = mock.method(puppet, 'onStart')
  /**
   * Puppet Server
   */
  const serverOptions = {
    endpoint: ENDPOINT,
    puppet,
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
  assert.ok((spyOnStart.mock.callCount() > 0), 'should called the puppet server onStart() function')

  puppetService.on('error', console.error)

  /**
   * Mock remote Stop RPC failure while event stream is still open
   */
  if (puppetService.grpcManager) {
    (puppetService.grpcManager.client as any).stop = async () => {
      throw new Error('mock remote stop RPC rejection')
    }
  }

  await puppetService.stop()

  // get eventStream status
  assert.throws(() => puppetService.grpcManager, 'should clean grpc after stop() even when remote Stop RPC fails')

  // setTimeout(() => whyIsNodeRunning(), 1000)
  await puppetServer.stop()
})
