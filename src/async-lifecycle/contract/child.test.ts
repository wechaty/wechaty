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
import { errorName, failedState, flush, observe, shutdown } from './harness.ts'
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
  // The parent's rollback stops the child it owned (C-CHILD-02, C-CHILD-04), and
  // stop() on a clean failure commits `stopped` (C-CMD-09).
  assert.equal(child.state.kind, 'stopped')
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

// ---------------------------------------------------------------------------
// Ported from the Claude suite (src/async-lifecycle-claude/engine.test.ts)
// ---------------------------------------------------------------------------

contract('C-CHILD-01.a', 'scope.start() refuses a child that is already running, with LifecycleUnsafeStateError', {}, async ({ make }) => {
  const child = make({ onStart () {} }).lifecycle
  await child.start()
  const { lifecycle } = make({ onStart: scope => scope.start(child) })
  const started = observe(lifecycle.start())
  await flush()
  assert.equal(errorName(started.error), 'LifecycleUnsafeStateError')
  assert.equal(child.state.kind, 'running', 'a refused claim leaves the child untouched')
  await shutdown(child)
})

contract('C-CHILD-01.b', 'two parents cannot own the same child', {}, async ({ make }) => {
  const gate = Promise.withResolvers<void>()
  const child = make({ onStart: () => gate.promise }).lifecycle
  const a = make({ onStart: scope => scope.start(child) }).lifecycle
  const b = make({ onStart: scope => scope.start(child) }).lifecycle
  const startA = observe(a.start())
  await flush()
  const startB = observe(b.start())
  await flush()
  assert.equal(errorName(startB.error), 'LifecycleUnsafeStateError')
  gate.resolve()
  await flush()
  assert.equal(startA.status, 'resolved')
  await shutdown(a)
})

contract('C-CHILD-02.b', 'a child whose stop failed stays owned until its owner\'s retry succeeds', {}, async ({ make }) => {
  let fails = 1
  const child = make({ onStart: scope => scope.defer(() => { if (fails-- > 0) { throw new Error('child release') } }) }).lifecycle
  const a = make({ onStart: scope => scope.start(child) }).lifecycle
  const b = make({ onStart: scope => scope.start(child) }).lifecycle
  await a.start()
  const first = observe(a.stop())
  await flush()
  assert.equal(first.status, 'rejected')
  await child.stop() // repaired directly
  assert.equal(child.state.kind, 'stopped')
  const refused = observe(b.start())
  await flush()
  assert.equal(errorName(refused.error), 'LifecycleUnsafeStateError', 'still owned by the first parent')

  const retried = observe(a.stop())
  await flush()
  assert.equal(retried.status, 'resolved')
  const claimed = observe(b.start())
  await flush()
  assert.equal(claimed.status, 'resolved')
  assert.equal(child.state.kind, 'running')
  await shutdown(b)
})

contract('C-CHILD-04.b', 'three nested levels mixing both entry points start top-down and retire with onStop top-down, children last', {}, async ({ shells }) => {
  const log: string[] = []
  const leaf = shells.createLifecycle({ onStart () { log.push('leaf+') }, onStop () { log.push('leaf-') } }).lifecycle
  const middle = shells.AsyncLifecycle({
    async onStart (scope) { log.push('middle+'); await scope.start(leaf) },
    onStop () { log.push('middle-') },
  }).lifecycle
  const root = shells.createLifecycle({
    async onStart (scope) { log.push('root+'); await scope.start(middle) },
    onStop () { log.push('root-') },
  }).lifecycle
  await root.start()
  const stopped = observe(root.stop())
  await flush()
  assert.equal(stopped.status, 'resolved')
  assert.deepEqual(log, [ 'root+', 'middle+', 'leaf+', 'root-', 'middle-', 'leaf-' ])
  assert.equal(leaf.state.kind, 'stopped')
  assert.equal(middle.state.kind, 'stopped')
})

contract('C-CHILD-05.c', 'escalation waits for the child to commit failed: the parent stays running while the child retires', {}, async ({ make }) => {
  const exit = new Error('child exit')
  const gate = Promise.withResolvers<void>()
  let childScope: LifecycleScope | undefined
  const child = make({ onStart (scope) { childScope = scope }, onStop: () => gate.promise }).lifecycle
  const { lifecycle } = make({ onStart: scope => scope.start(child) })
  await lifecycle.start()
  childScope!.fail(exit)
  await flush()
  assert.equal(lifecycle.state.kind, 'running', 'the child has not committed failed yet')
  gate.resolve()
  await flush()
  const state = failedState(lifecycle.state)
  assert.equal(state.phase, 'run')
  assert.equal((state.error as Error).cause, exit)
})

contract('C-CHILD-05.d', 'a child that recovers itself does not fail its parent', { needs: [ 'scope.recover' ] }, async ({ make }) => {
  let childScope: LifecycleScope | undefined
  const child = make({ onStart (scope) { childScope = scope } }).lifecycle
  const { lifecycle } = make({ onStart: scope => scope.start(child) })
  await lifecycle.start()
  const recovered = observe(childScope!.recover())
  await flush()
  assert.equal(recovered.value, 'recovered')
  assert.deepEqual(child.state, { kind: 'running', generation: 2 })
  assert.deepEqual(lifecycle.state, { kind: 'running', generation: 1 })
  await shutdown(lifecycle)
})
