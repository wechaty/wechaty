/**
 *   Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016-2026 Huan Li <huan@chatie.io>
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
 * Unit tests for `service-mixin.ts`: verifies the async lifecycle migration
 * (wechaty/wechaty#3024) based on the S5 puppet contract.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import type {
  ServiceMixin,
  ProtectedPropertyServiceMixin,
}                                 from './service-mixin.ts'
import { PuppetTest }             from '../../tests/fixtures/puppet-test/puppet-test.ts'

/** Yields to the microtask queue so pending promise reactions can settle. */
async function flush (turns = 50): Promise<void> {
  for (let i = 0; i < turns; i++) {
    await Promise.resolve()
  }
}

/** Observes a promise without awaiting it. */
function observe<T> (promise: Promise<T>) {
  const box: { status: 'pending' | 'resolved' | 'rejected', value?: T, error?: unknown } = {
    status: 'pending',
  }
  promise.then(
    value => { box.status = 'resolved'; box.value = value },
    error => { box.status = 'rejected'; box.error = error },
  )
  return box
}

/** Extracts the name of an error. */
function errorName (error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'name' in error && typeof (error as any).name === 'string'
    ? (error as any).name
    : undefined
}

/** Scriptable test provider based on PuppetTest. */
class ScriptedPuppet extends PuppetTest {

  readonly log: string[] = []
  startHook: () => Promise<void> = async () => {}
  stopHook: () => Promise<void> = async () => {}
  sendHook: (text: string) => Promise<string> = async text => `id:${text}`

  override async onStart (): Promise<void> {
    this.log.push('onStart')
    await this.startHook()
  }

  override async onStop (): Promise<void> {
    this.log.push('onStop')
    await this.stopHook()
  }

  override async messageSendText (_conversationId: string, text: string): Promise<string> {
    this.log.push(`send:${text}`)
    return this.sendHook(text)
  }

}

test('ProtectedPropertyServiceMixin matches all internal properties', async () => {
  type NotExistInMixin = Exclude<ProtectedPropertyServiceMixin, keyof InstanceType<ServiceMixin>>
  type NotExistTest = NotExistInMixin extends never ? true : false

  const noOneLeft: NotExistTest = true
  assert.ok(noOneLeft, 'should match Mixin properties for every protected property')
})

test('a provider with zero-argument onStart() / onStop() works unchanged; login and ready are conditions of the run', async () => {
  const puppet = new ScriptedPuppet()
  const ready = observe(puppet.ready())
  await puppet.start()
  puppet.emit('login', { contactId: 'user-1' } as any)
  puppet.emit('ready', { data: 'ready' } as any)
  await flush()

  assert.equal(ready.status, 'resolved')
  assert.equal(puppet.isLoggedIn, true)
  assert.equal(puppet.state.active(), true)

  await puppet.stop()
  assert.equal(puppet.isLoggedIn, false, 'never reports a previous run')
  assert.equal(puppet.state.inactive(), true)
})

test('a QR code scan clears ready, and a logout clears login and ready', async () => {
  const puppet = new ScriptedPuppet()
  await puppet.start()
  puppet.emit('login', { contactId: 'user-1' } as any)
  puppet.emit('ready', { data: 'ready' } as any)
  await puppet.ready()
  assert.equal(puppet.isLoggedIn, true)

  puppet.emit('scan', { qrcode: 'scan-qr', status: 0 } as any)
  const again = observe(puppet.ready())
  await flush()
  assert.equal(again.status, 'pending', 'new scan clears readiness')

  puppet.emit('ready', { data: 'ready' } as any)
  await flush()
  assert.equal(again.status, 'resolved')

  puppet.emit('logout', { contactId: 'user-1', data: 'logout' } as any)
  assert.equal(puppet.isLoggedIn, false)
  await puppet.stop()
})

test('onStop() is still the cleanup after a partial start, called once, and the start error is reported', async () => {
  const puppet = new ScriptedPuppet()
  const failure = new Error('login failed')
  const errors: unknown[] = []
  puppet.on('error', error => { errors.push(error) })
  puppet.startHook = async () => { throw failure }

  await assert.rejects(puppet.start(), (error: unknown) => error === failure)
  await flush()
  assert.deepEqual(puppet.log, [ 'onStart', 'onStop' ])
  assert.equal(errors.length, 1, 'emitted startup error to error listener')
  const failedState = puppet.state
  assert.equal(failedState.kind, 'failed')
  assert.equal(failedState.inactive(), true)
})

test('a provider whose onStart() settles only after onStop() is called can be stopped while starting', async () => {
  const puppet = new ScriptedPuppet()
  const stopped = Promise.withResolvers<void>()
  puppet.startHook = () => stopped.promise // padlocal/wechaty-puppet-padlocal#116
  puppet.stopHook = async () => stopped.resolve()

  const started = observe(puppet.start())
  await flush()
  const startingState = puppet.state
  assert.equal(startingState.kind, 'starting')
  assert.equal(startingState.active(), 'pending')

  await puppet.stop()
  assert.deepEqual(puppet.log, [ 'onStart', 'onStop' ], 'onStop() called once at abort')
  assert.equal(errorName(started.error), 'LifecycleSupersededError')
  const stoppedState = puppet.state
  assert.equal(stoppedState.kind, 'stopped')
  assert.equal(stoppedState.inactive(), true)
})

test('send() is an operation of the run: refused before start, waited for by stop(), and refused after it', async () => {
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
  await puppet.start()
  const refused = new Error('message refused')
  puppet.sendHook = async () => { throw refused }

  await assert.rejects(puppet.send('room', 'spam'), (error: unknown) => error === refused)
  assert.equal(puppet.state.kind, 'running')
  assert.equal(puppet.state.active(), true)
  await puppet.stop()
})

test('legacy state-switch view methods (active, inactive, on, off) and reset() operate accurately', async () => {
  const puppet = new ScriptedPuppet()
  assert.equal(puppet.state.active(), false)
  assert.equal(puppet.state.inactive(), true)
  assert.equal(puppet.state.on(), false)
  assert.equal(puppet.state.off(), true)

  await puppet.start()
  assert.equal(puppet.state.active(), true)
  assert.equal(puppet.state.inactive(), false)
  assert.equal(puppet.state.on(), true)
  assert.equal(puppet.state.off(), false)

  let resetEventFired = false
  puppet.on('reset', () => { resetEventFired = true })
  await puppet.reset('manual reset')

  assert.equal(resetEventFired, true)
  assert.equal(puppet.state.kind, 'running')
  assert.equal(puppet.state.active(), true)

  await puppet.stop()
  assert.equal(puppet.state.active(), false)
  assert.equal(puppet.state.inactive(), true)
})

test('watchdog automatically recovers the puppet when heartbeats stop', async () => {
  const puppet = new ScriptedPuppet({ timeoutSeconds: 0.05 } as any)
  await puppet.start()
  assert.equal(puppet.state.generation, 1)

  // Feeding heartbeat keeps it at generation 1
  puppet.emit('heartbeat', { data: 'alive' } as any)
  await new Promise(resolve => setTimeout(resolve, 20))
  assert.equal(puppet.state.generation, 1)

  // Waiting for timeout triggers automatic recovery to generation 2
  for (let i = 0; i < 50; i++) {
    await new Promise(resolve => setTimeout(resolve, 10))
    if ((puppet.state as any).generation === 2) {
      break
    }
  }

  assert.equal((puppet.state as any).generation, 2, 'puppet recovered to generation 2')
  assert.equal(puppet.state.active(), true)
  await puppet.stop()
})

