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
 * Contract tests for owned children (README §10, C-CHILD-*). Parents and
 * children are built on the same implementation and entry point.
 */

import assert from 'node:assert/strict'

import type { LifecycleScope } from '../types.ts'
import { errorName, flush, observe, shutdown } from './harness.ts'
import { contract } from './suite.ts'

contract('C-CHILD-05.a', 'a child that stops without the parent asking fails the parent generation, phase `run`', {}, async ({ make }) => {
  const child = make({ onStart () {} }).lifecycle
  const parent = make({ async onStart (scope) { await scope.start(child) } }).lifecycle
  await parent.start()
  await child.stop()
  await flush()
  const state = parent.state
  assert.ok(state.kind === 'failed')
  assert.equal(state.phase, 'run')
  await shutdown(parent)
})

contract('C-CHILD-05.b', 'a child failure fails the parent with an error whose cause is the child\'s error', {}, async ({ make }) => {
  const reason = new Error('child run failed')
  let childScope: LifecycleScope | undefined
  const child = make({ onStart (scope) { childScope = scope } }).lifecycle
  const parent = make({ async onStart (scope) { await scope.start(child) } }).lifecycle
  await parent.start()
  childScope!.fail(reason)
  await flush()
  const state = parent.state
  assert.ok(state.kind === 'failed')
  assert.ok(state.error instanceof Error)
  assert.equal(state.error.cause, reason)
  await shutdown(parent)
})

contract('C-CHILD-03.a', 'stopping the parent while its child is still starting cancels the child\'s start', {}, async ({ make }) => {
  const entered = Promise.withResolvers<void>()
  let childAborted = false
  const child = make({
    async onStart (scope) {
      entered.resolve()
      await new Promise<void>(resolve => scope.signal.addEventListener('abort', () => resolve(), { once: true }))
      childAborted = true
    },
  }).lifecycle
  const parent = make({ async onStart (scope) { await scope.start(child) } }).lifecycle
  const started = observe(parent.start())
  await entered.promise
  const stopped = observe(parent.stop())
  await flush()
  assert.equal(errorName(started.error), 'LifecycleSupersededError')
  assert.equal(stopped.status, 'resolved')
  assert.equal(childAborted, true)
  assert.equal(child.state.kind, 'stopped')
  assert.equal(parent.state.kind, 'stopped')
})

contract('C-CHILD-06.a', 'a child whose start fails fails the parent with that error and no extra rejection', {}, async ({ make }) => {
  const reason = new Error('child failed')
  const child = make({ onStart () { throw reason } }).lifecycle
  const parent = make({ async onStart (scope) { await scope.start(child) } }).lifecycle
  const started = observe(parent.start())
  await flush()
  assert.equal(started.error, reason)
  assert.equal(parent.state.kind, 'failed')
  assert.notEqual(child.state.kind, 'running')
  await shutdown(parent)
})

contract('C-CHILD-02.a', 'a child stays owned until its first parent has released it, so a second parent cannot claim it', {}, async ({ make }) => {
  const gate = Promise.withResolvers<void>()
  const child = make({ onStart () {} }).lifecycle
  const parent = make({
    async onStart (scope) { await scope.start(child) },
    onStop: () => gate.promise,
  }).lifecycle
  const another = make({ async onStart (scope) { await scope.start(child) } }).lifecycle
  await parent.start()
  await child.stop() // stops on its own: the parent fails, but has not released it yet
  await flush()
  const refused = observe(another.start())
  await flush()
  assert.equal(errorName(refused.error), 'LifecycleUnsafeStateError')

  gate.resolve()
  await flush()
  assert.equal(parent.state.kind, 'failed')
  const claimed = observe(another.start())
  await flush()
  assert.equal(claimed.status, 'resolved')
  await shutdown(another)
  await shutdown(parent)
})

contract('C-CHILD-04.a', 'three nested levels start top-down and release bottom-up', {}, async ({ make }) => {
  const trace: string[] = []
  const provider = make({
    onStart (scope) {
      trace.push('start provider')
      scope.defer(() => { trace.push('release provider') })
    },
  }).lifecycle
  const puppet = make({
    async onStart (scope) {
      trace.push('start puppet')
      scope.defer(() => { trace.push('release puppet') })
      await scope.start(provider)
    },
  }).lifecycle
  const wechaty = make({
    async onStart (scope) {
      trace.push('start wechaty')
      scope.defer(() => { trace.push('release wechaty') })
      await scope.start(puppet)
    },
  }).lifecycle

  await wechaty.start()
  const stopped = observe(wechaty.stop())
  await flush()
  assert.equal(stopped.status, 'resolved')
  assert.deepEqual(trace, [
    'start wechaty', 'start puppet', 'start provider',
    'release provider', 'release puppet', 'release wechaty',
  ])
  for (const lifecycle of [ wechaty, puppet, provider ]) {
    assert.equal(lifecycle.state.kind, 'stopped')
  }
})
