/**
 *   Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */
/**
 * Tests for `IoClient` on the async lifecycle module (wechaty/wechaty#3022),
 * with a fake bot, fake sockets and a fake PuppetServer.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import type { PuppetServerOptions } from 'wechaty-puppet-service'

import { flush, FakeWechaty, testIo, type TestIo } from '../tests/fixtures/io-fakes.ts'
import { IoClient, type IoPuppetServer } from './io-client.ts'
import type { Io, IoOptions } from './io.ts'

/** An IoClient whose Io links and PuppetServers are fakes logging into the bot's log. */
class TestIoClient extends IoClient {

  readonly bot: FakeWechaty
  readonly ios: TestIo[] = []
  failServerStart = false

  constructor (bot: FakeWechaty) {
    super({ token: 'test-token', wechaty: bot as never })
    this.bot = bot
  }

  protected override createIo (_options: IoOptions): Io {
    const io = testIo(this.bot)
    this.ios.push(io)
    this.bot.log.push(`io ${this.ios.length} created`)
    return io
  }

  protected override createPuppetServer (_options: PuppetServerOptions): IoPuppetServer {
    const log = this.bot.log
    const fail = this.failServerStart
    return {
      start: async () => {
        log.push('server start')
        if (fail) {
          throw new Error('port in use')
        }
      },
      stop: async () => { log.push('server stop') },
    }
  }

}

test('start() starts the Io link, the bot, then the PuppetServer; stop() releases them in reverse', async () => {
  const bot = new FakeWechaty()
  const client = new TestIoClient(bot)
  await client.start()
  assert.deepEqual(bot.log, [ 'io 1 created', 'wechaty start', 'server start' ])
  assert.equal(client.ios[0]!.state.kind, 'running')
  await client.stop()
  assert.deepEqual(bot.log.slice(3), [ 'server stop', 'wechaty stop' ])
  assert.equal(client.ios[0]!.state.kind, 'stopped', 'the Io link is stopped after the bot')
  assert.equal(client.ios[0]!.socket.closes, 1)
})

test('a start that fails halfway releases what was already started', async () => {
  const bot = new FakeWechaty()
  const client = new TestIoClient(bot)
  client.failServerStart = true
  await assert.rejects(client.start(), /port in use/)
  await flush()
  assert.deepEqual(bot.log, [ 'io 1 created', 'wechaty start', 'server start', 'server stop', 'wechaty stop' ])
  assert.equal(client.ios[0]!.state.kind, 'stopped')
})

test('a PuppetServer whose start() rejects is still stopped, since it may have set up resources first', async () => {
  const bot = new FakeWechaty()
  const client = new TestIoClient(bot)
  client.failServerStart = true
  await assert.rejects(client.start(), /port in use/)
  await flush()
  assert.deepEqual(bot.log.slice(2), [ 'server start', 'server stop', 'wechaty stop' ])
})

test('restart() stops everything and starts again with a new Io link', async () => {
  const bot = new FakeWechaty()
  const client = new TestIoClient(bot)
  await client.start()
  await client.restart()
  assert.deepEqual(bot.log, [
    'io 1 created', 'wechaty start', 'server start',
    'server stop', 'wechaty stop',
    'io 2 created', 'wechaty start', 'server start',
  ])
  assert.equal(client.ios[0]!.state.kind, 'stopped')
  assert.equal(client.ios[1]!.state.kind, 'running')
  await client.stop()
})

test('the Io link reconnecting on its own does not stop the client', async () => {
  const bot = new FakeWechaty()
  const client = new TestIoClient(bot)
  await client.start()
  const io = client.ios[0]!
  io.sockets[0]!.drop()
  await io.whenState(state => state.kind === 'running' && state.generation === 2)
  assert.deepEqual(bot.log, [ 'io 1 created', 'wechaty start', 'server start' ], 'nothing was stopped')
  await client.stop()
  assert.equal(io.state.kind, 'stopped')
})

test('hookWechaty handles CustomEvents for scan, login, message, and logout without throwing', async () => {
  const bot = new FakeWechaty()
  const client = new TestIoClient(bot)
  await client.start()

  const fakeUser = { name: () => 'TestBot' }
  const fakeMessage = { text: () => 'hello', self: () => false }

  assert.doesNotThrow(() => {
    bot.dispatchEvent(new CustomEvent('scan', { detail: { qrcode: 'https://scan', status: 2 } }))
    bot.dispatchEvent(new CustomEvent('login', { detail: fakeUser }))
    bot.dispatchEvent(new CustomEvent('message', { detail: fakeMessage }))
    bot.dispatchEvent(new CustomEvent('logout', { detail: { contact: fakeUser, data: 'logout' } }))
  })

  await client.stop()
})
