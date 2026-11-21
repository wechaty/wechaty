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

import { EventEmitter } from 'node:events'

import type { Lifecycle, LifecycleScope } from '../types.ts'
import { errorName, failedState, flush, ManualClock, observe, shutdown, stateTrace } from './harness.ts'
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

contract('C-CHILD-04.b', 'three nested levels mixing both entry points start top-down and retire with onStop top-down, children last', {}, async ({ make, shells }) => {
  // The root uses the entry point under test, so both a composed and an
  // inherited root are covered, each with descendants built the other ways.
  const log: string[] = []
  const leaf = shells.createLifecycle({ onStart () { log.push('leaf+') }, onStop () { log.push('leaf-') } }).lifecycle
  const middle = shells.AsyncLifecycle({
    async onStart (scope) { log.push('middle+'); await scope.start(leaf) },
    onStop () { log.push('middle-') },
  }).lifecycle
  const root = make({
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
  childScope!.recover() // its decision is checked by C-REC-03
  await flush()
  assert.deepEqual(child.state, { kind: 'running', generation: 2 })
  assert.deepEqual(lifecycle.state, { kind: 'running', generation: 1 })
  await shutdown(lifecycle)
})

// ---------------------------------------------------------------------------
// Accepted decisions D32 and D33 (#2968 §6)
// ---------------------------------------------------------------------------

contract('C-CHILD-07.a', 'a child that restarts itself while its parent stops it leaves the parent with cleanup debt; the next stop() stops it (D32)', {}, async ({ make }) => {
  // Ported from the Codex suite ("a replacement child remains owned until a
  // subsequent parent stop releases it").
  let restarted: ReturnType<typeof observe<void>> | undefined
  let child!: ReturnType<typeof make>['lifecycle']
  ;({ lifecycle: child } = make({
    onStart () {},
    onStop () { restarted ??= observe(child.start()) },
  }))
  const parent = make({ onStart: scope => scope.start(child) }).lifecycle
  await parent.start()

  const first = observe(parent.stop())
  await flush()
  assert.equal(errorName(first.error), 'LifecycleUnsafeStateError', 'the child was not stopped when its stop settled')
  assert.equal(restarted?.status, 'resolved')
  assert.equal(child.state.kind, 'running')
  assert.equal(failedState(parent.state).cleanupComplete, false, 'the parent still owns a running child')

  const second = observe(parent.stop())
  await flush()
  assert.equal(second.status, 'resolved')
  assert.equal(child.state.kind, 'stopped')
  assert.equal(parent.state.kind, 'stopped')
})

for (const command of [ 'start', 'restart', 'stop-after-failure' ] as const) {
  contract(`C-CHILD-01.c-${command}`, `a claim right after the child's own ${command === 'stop-after-failure' ? 'stop() of a clean failure' : command + '()'} is decided by its public state alone (D33)`, {}, async ({ make }) => {
    // The Codex source tests refused these claims through private state. D33
    // decides by public state: a child that reads `stopped` or a clean `failed`
    // can be claimed, and the claim joins whatever it is doing; a child that
    // already reads `starting` or `stopping` is refused.
    let fail = command === 'stop-after-failure'
    const child = make({ onStart () { if (fail) { throw new Error('first start failed') } } }).lifecycle
    // Read through a call: an assertion would narrow `child.state` statically.
    const kind = () => child.state.kind
    let owner: LifecycleScope | undefined
    const parent = make({ onStart (scope) { owner = scope } }).lifecycle
    await parent.start()
    if (command === 'stop-after-failure') {
      observe(child.start())
      await flush()
      assert.equal(kind(), 'failed')
      fail = false
    }
    const independent = observe(command === 'stop-after-failure' ? child.stop() : child[command]())
    const seen = child.state
    const claimable = seen.kind === 'stopped' || (seen.kind === 'failed' && seen.cleanupComplete)
    const claimed = observe(owner!.start(child))
    await flush()
    assert.equal(independent.status, 'resolved')
    if (claimable) {
      assert.equal(claimed.status, 'resolved', `it read \`${seen.kind}\`, so it could be claimed`)
      assert.equal(kind(), 'running')
      await parent.stop()
      assert.equal(kind(), 'stopped', 'the parent owned it')
    } else {
      assert.equal(errorName(claimed.error), 'LifecycleUnsafeStateError', `it read \`${seen.kind}\`, so it could not be claimed`)
      await shutdown(parent)
      await shutdown(child)
    }
  })
}

for (const how of [ 'stops', 'fails' ] as const) {
  contract(`C-CHILD-05.e-${how}`, `a child that ${how === 'stops' ? 'is stopped by someone else' : 'fails'} while its parent is retiring does not fail the parent; the parent stops it as usual (D39)`, {}, async ({ make }) => {
    // The Copilot source ended the parent `failed` with LifecycleChildFailureError.
    const gate = Promise.withResolvers<void>()
    let childScope: LifecycleScope | undefined
    const child = make({ onStart (scope) { childScope = scope } }).lifecycle
    const parent = make({
      async onStart (scope) { await scope.start(child) },
      onStop: () => gate.promise,
    }).lifecycle
    await parent.start()
    const stopped = observe(parent.stop())
    await flush()
    if (how === 'stops') {
      await child.stop()
    } else {
      childScope!.fail(new Error('child failed'))
      await flush()
    }
    assert.equal(child.state.kind, how === 'stops' ? 'stopped' : 'failed')
    gate.resolve()
    await flush()
    assert.equal(stopped.status, 'resolved')
    assert.deepEqual(parent.state, { kind: 'stopped', generation: 1 })
    assert.equal(child.state.kind, 'stopped')
  })
}

// ---------------------------------------------------------------------------
// From the acceptance lists: v1 design §6, #2911 §9 and the ChatGPT review §7
// ---------------------------------------------------------------------------

for (const part of [ 'escalate', 'stop' ] as const) {
  const title = part === 'escalate'
    ? 'a child whose own recovery fails to start a replacement fails its parent, with the failure as cause; a recovery that succeeds does not (C-REC-06)'
    : 'after a child\'s failed recovery fails its parent, the parent\'s retirement stops the cleanly failed child (C-CMD-09)'
  contract(`C-CHILD-05.f-${part}`, title, { needs: [ 'scope.recover' ] }, async ({ make }) => {
    // Split so each implementation's known failure covers only its own part:
    // the recovery's own outcome is C-REC-06.a, and the parent's error type is
    // checked by C-CHILD-05.g.
    const boom = new Error('replacement failed')
    let childScope: LifecycleScope | undefined
    let childStarts = 0
    const childTrace = stateTrace()
    const child = make({
      onStart (scope) {
        childScope = scope
        if (++childStarts === 3) {
          throw boom
        }
      },
      onStateChange: childTrace.onStateChange,
    }).lifecycle
    const parent = make({ async onStart (scope) { await scope.start(child) } }).lifecycle
    await parent.start()
    childScope!.recover()
    await flush()
    assert.deepEqual(parent.state, { kind: 'running', generation: 1 }, 'a successful recovery is not escalated')

    childScope!.recover()
    await flush()
    assert.ok(childTrace.kinds.includes('failed:3'), 'the child committed its failure')
    if (part === 'escalate') {
      const failed = failedState(parent.state)
      assert.equal(failed.phase, 'run')
      assert.equal((failed.error as Error).cause, boom)
    } else {
      assert.equal(parent.state.kind, 'failed')
      assert.equal(child.state.kind, 'stopped')
    }
    await shutdown(parent)
  })
}

contract('C-CHILD-05.g', 'when one child stops on its own, the parent fails and stops its other children newest first', {}, async ({ make }) => {
  const log: string[] = []
  const children = [ 'a', 'b', 'c' ].map(name => make({ onStart () {}, onStop () { log.push(name) } }).lifecycle)
  const parent = make({
    async onStart (scope) {
      for (const child of children) {
        await scope.start(child)
      }
    },
  }).lifecycle
  await parent.start()
  await children[1]!.stop()
  await flush()
  assert.equal(parent.state.kind, 'failed')
  assert.deepEqual(log, [ 'b', 'c', 'a' ], 'b stopped on its own, then c and a newest first')
  assert.ok(children.every(child => child.state.kind === 'stopped'))
  assert.equal(errorName(failedState(parent.state).error), 'LifecycleChildFailureError')
  await shutdown(parent)
})

contract('C-CHILD-04.c', 'three nested levels mixing both entry points leave no listener, timer or task after stop()', { needs: [ 'clock' ] }, async ({ make, shells }) => {
  const clock = new ManualClock()
  const emitter = new EventEmitter()
  const tasks: string[] = []
  const options = { clock, startTimeoutMs: 1000, stopTimeoutMs: 1000 }
  const level = (name: string, next?: Lifecycle) => async (scope: LifecycleScope) => {
    const listener = () => {}
    emitter.on('tick', listener)
    scope.defer(() => emitter.off('tick', listener))
    scope.spawn(async signal => {
      await new Promise<void>(resolve => signal.addEventListener('abort', () => resolve(), { once: true }))
      tasks.push(name)
    })
    if (next) {
      await scope.start(next)
    }
  }
  const leaf = shells.createLifecycle({ onStart: level('leaf') }, options).lifecycle
  const middle = shells.AsyncLifecycle({ onStart: level('middle', leaf) }, options).lifecycle
  const root = make({ onStart: level('root', middle) }, options).lifecycle
  await root.start()
  assert.equal(emitter.listenerCount('tick'), 3)
  const stopped = observe(root.stop())
  await flush()
  assert.equal(stopped.status, 'resolved')
  assert.equal(emitter.listenerCount('tick'), 0, 'no listener')
  assert.equal(clock.pending, 0, 'no timer')
  assert.deepEqual(tasks.sort(), [ 'leaf', 'middle', 'root' ], 'every task finished')
  assert.ok([ root, middle, leaf ].every(lifecycle => lifecycle.state.kind === 'stopped'))
})
