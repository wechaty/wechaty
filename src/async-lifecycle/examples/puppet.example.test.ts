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
 * Runs the `Puppet` example (S5, wechaty/wechaty#2973): providers written
 * against today's zero-argument `onStart()` / `onStop()` contract work
 * unchanged, `login` and `ready` are generation-bound conditions, and sends
 * are operations that `stop()` waits for (D24).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'

import { errorName, flush, observe } from '../contract/harness.ts'
import { Puppet, PuppetMock } from './puppet.example.ts'

/** A provider whose hooks are scripted by the test; it logs every call. */
class ScriptedPuppet extends Puppet {

  readonly log: string[] = []
  startHook: () => Promise<void> = async () => {}
  stopHook: () => Promise<void> = async () => {}
  sendHook: (text: string) => Promise<string> = async text => `id:${text}`

  protected override async onStart (): Promise<void> {
    this.log.push('onStart')
    await this.startHook()
  }

  protected override async onStop (): Promise<void> {
    this.log.push('onStop')
    await this.stopHook()
  }

  protected override async messageSendText (_conversationId: string, text: string): Promise<string> {
    this.log.push(`send:${text}`)
    return this.sendHook(text)
  }

}

test('a provider with zero-argument onStart() / onStop() works unchanged; login and ready are conditions of the run', async () => {
  const puppet = new PuppetMock()
  const ready = observe(puppet.ready()) // before start(): binds to the next run
  await puppet.start()
  await flush()
  assert.equal(ready.status, 'resolved')
  assert.equal(puppet.isLoggedIn, true)
  await puppet.stop()
  assert.equal(puppet.isLoggedIn, false, 'never reports a previous run')
})

test('a QR code clears ready, and a logout clears login and ready', async () => {
  const puppet = new ScriptedPuppet()
  await puppet.start()
  puppet.emit('login', 'user')
  puppet.emit('ready')
  await puppet.ready()
  puppet.emit('scan', 'qr')
  const again = observe(puppet.ready())
  await flush()
  assert.equal(again.status, 'pending', 'a new QR code means not ready')
  puppet.emit('ready')
  await flush()
  assert.equal(again.status, 'resolved')
  puppet.emit('logout', 'user')
  assert.equal(puppet.isLoggedIn, false)
  await puppet.stop()
})

test('onStop() is still the cleanup after a partial start, called once, and the start error is reported', async () => {
  const puppet = new ScriptedPuppet()
  const failure = new Error('login failed')
  const errors: unknown[] = []
  puppet.on('error', error => errors.push(error))
  puppet.startHook = async () => { throw failure }
  await assert.rejects(puppet.start(), (error: unknown) => error === failure)
  await flush()
  assert.deepEqual(puppet.log, [ 'onStart', 'onStop' ])
  assert.deepEqual(errors, [ failure ], "mapped to today's 'error' event")
  assert.ok(puppet.state.kind === 'failed' && puppet.state.cleanupComplete)
})

test('a provider whose onStart() settles only after onStop() is called can be stopped while starting', async () => {
  const puppet = new ScriptedPuppet()
  const stopped = Promise.withResolvers<void>()
  puppet.startHook = () => stopped.promise // padlocal/wechaty-puppet-padlocal#116
  puppet.stopHook = async () => stopped.resolve()
  const started = observe(puppet.start())
  await flush()
  assert.equal(puppet.state.kind, 'starting')
  await puppet.stop()
  assert.deepEqual(puppet.log, [ 'onStart', 'onStop' ], 'onStop() called once, at abort')
  assert.equal(errorName(started.error), 'LifecycleSupersededError')
  assert.equal(puppet.state.kind, 'stopped')
})

test('send() is an operation of the run: refused before start, waited for by stop(), and refused after it (D24)', async () => {
  const puppet = new ScriptedPuppet()
  await assert.rejects(puppet.send('room', 'early'), (error: unknown) => errorName(error) === 'LifecycleUnsafeStateError')

  await puppet.start()
  const wire = Promise.withResolvers<string>()
  puppet.sendHook = () => wire.promise
  const sent = observe(puppet.send('room', 'hello'))
  const stopped = observe(puppet.stop())
  await flush()
  assert.deepEqual(puppet.log, [ 'onStart', 'send:hello' ], 'onStop() waits for the send')
  assert.equal(stopped.status, 'pending')
  wire.resolve('message-1')
  await flush()
  assert.equal(sent.value, 'message-1')
  assert.deepEqual(puppet.log, [ 'onStart', 'send:hello', 'onStop' ])
  assert.equal(stopped.status, 'resolved')

  await assert.rejects(puppet.send('room', 'late'), (error: unknown) => errorName(error) === 'LifecycleSupersededError')
})

test('a failed send goes to its caller and leaves the puppet running', async () => {
  const puppet = new ScriptedPuppet()
  const refused = new Error('message refused')
  puppet.sendHook = async () => { throw refused }
  await puppet.start()
  await assert.rejects(puppet.send('room', 'spam'), (error: unknown) => error === refused)
  await flush()
  assert.equal(puppet.state.kind, 'running')
  await puppet.stop()
})
