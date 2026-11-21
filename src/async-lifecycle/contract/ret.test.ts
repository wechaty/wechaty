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
 * Contract tests for retirement (README §7, C-RET-*).
 */

import assert from 'node:assert/strict'

import type { LifecycleScope } from '../types.ts'
import { errorName, failedState, flush, observe, shutdown } from './harness.ts'
import { contract } from './suite.ts'

contract('C-RET-01.a', 'retirement order: onStop, abort, the task finishes with live resources, then releases newest first', {}, async ({ make }) => {
  const taskEntered = Promise.withResolvers<void>()
  const order: string[] = []
  const { lifecycle } = make({
    onStart (scope) {
      scope.defer(() => { order.push('close transport') })
      scope.defer(() => { order.push('release subscription') })
      const ioCanceled = Promise.withResolvers<void>()
      scope.signal.addEventListener('abort', () => {
        order.push('interrupt I/O')
        ioCanceled.resolve()
      }, { once: true })
      scope.spawn(async () => {
        taskEntered.resolve()
        await ioCanceled.promise
        await Promise.resolve()
        order.push('finish task using transport')
      })
    },
    onStop () { order.push('graceful goodbye') },
  })
  await lifecycle.start()
  await taskEntered.promise
  const disposed = observe(lifecycle[Symbol.asyncDispose]())
  await flush()
  assert.equal(disposed.status, 'resolved')
  assert.deepEqual(order, [
    'graceful goodbye', 'interrupt I/O', 'finish task using transport', 'release subscription', 'close transport',
  ])
})

contract('C-RET-02.a', 'a throwing onStop is a cleanup error: other releases still run, and the value is kept as given', {}, async ({ make }) => {
  let released = false
  const { lifecycle } = make({
    onStart (scope) { scope.defer(() => { released = true }) },
    onStop () { throw null }, // falsy failures must survive as themselves
  })
  await lifecycle.start()
  const stopped = observe(lifecycle.stop())
  await flush()
  assert.equal(stopped.status, 'rejected')
  assert.equal(stopped.error, null)
  assert.equal(released, true)
  assert.ok(lifecycle.state.kind === 'failed')
  assert.equal(lifecycle.state.phase, 'stop')
  assert.equal(lifecycle.state.error, null)
  assert.equal(lifecycle.state.cleanupComplete, true, 'onStop is never retried, so nothing stays owned')
  const retried = await shutdown(lifecycle)
  assert.equal(retried.status, 'resolved')
  assert.equal(lifecycle.state.kind, 'stopped')
})

contract('C-RET-04.a', 'a release that fails during a runtime failure stays owned and the next stop() retries it', {}, async ({ make }) => {
  const reason = new Error('release failed')
  let tries = 0
  let current: LifecycleScope | undefined
  const { lifecycle } = make({
    onStart (scope) {
      current = scope
      scope.defer(() => {
        if (++tries === 1) {
          throw reason
        }
      })
    },
  })
  await lifecycle.start()
  current!.fail(new Error('runtime failure'))
  await flush()
  const failed = lifecycle.state
  assert.ok(failed.kind === 'failed')
  assert.equal(failed.phase, 'run')
  assert.equal(failed.cleanupError, reason, 'C-RET-04: a single cleanup error is reported as itself')
  assert.equal(failed.cleanupComplete, false)

  const stopped = observe(lifecycle.stop())
  await flush()
  assert.equal(stopped.status, 'resolved')
  assert.equal(tries, 2)
  assert.equal(lifecycle.state.kind, 'stopped')
})

// ---------------------------------------------------------------------------
// Ported from the Claude suite (src/async-lifecycle-claude/engine.test.ts)
// ---------------------------------------------------------------------------

contract('C-RET-01.b', 'a cleanup registered after a child is released first, and still sees that child running', {}, async ({ make }) => {
  let seen = ''
  const child = make({ onStart () {} }).lifecycle
  const { lifecycle } = make({
    async onStart (scope) {
      await scope.start(child)
      scope.defer(() => { seen = child.state.kind })
    },
  })
  await lifecycle.start()
  await lifecycle.stop()
  assert.equal(seen, 'running')
  assert.equal(child.state.kind, 'stopped')
})

contract('C-RET-01.c', 'the task is joined first, then defer, child, use and acquire are released newest first (D9)', { needs: [ 'scope.acquire' ] }, async ({ make }) => {
  const log: string[] = []
  const child = make({ onStart () {}, onStop () { log.push('child') } }).lifecycle
  const { lifecycle } = make({
    async onStart (scope) {
      await scope.acquire(() => 'resource', () => { log.push('acquire') })
      scope.use({ [Symbol.dispose]: () => { log.push('use') } })
      await scope.start(child)
      scope.spawn(signal => new Promise<void>(resolve => {
        signal.addEventListener('abort', () => { log.push('task ends on abort'); resolve() })
      }))
      scope.defer(() => { log.push('defer') })
    },
  })
  await lifecycle.start()
  const stopped = observe(lifecycle.stop())
  await flush()
  assert.equal(stopped.status, 'resolved')
  assert.deepEqual(log, [ 'task ends on abort', 'defer', 'child', 'use', 'acquire' ])
})

contract('C-RET-01.d', 'onStop runs before scope.signal aborts, with live resources and a separate deadline signal', { needs: [ 'onStop.context' ] }, async ({ make }) => {
  const log: string[] = []
  let saved: { signal: AbortSignal } | undefined
  const { lifecycle } = make({
    onStart (scope) {
      saved = scope
      scope.defer(() => { log.push('release') })
    },
    onStop (stop) {
      log.push(`onStop reason=${stop.reason} aborted=${saved!.signal.aborted} same=${stop.signal === saved!.signal}`)
    },
  })
  await lifecycle.start()
  await lifecycle.stop()
  assert.deepEqual(log, [ 'onStop reason=stop aborted=false same=false', 'release' ])
})

contract('C-RET-02.b', 'onStop receives the reasons `recover` and `failure`', { needs: [ 'onStop.context', 'scope.recover' ] }, async ({ make }) => {
  const reasons: string[] = []
  let saved: { recover (reason?: unknown): unknown, fail (error: unknown): void } | undefined
  const { lifecycle } = make({ onStart (scope) { saved = scope }, onStop (stop) { reasons.push(stop.reason) } })
  await lifecycle.start()
  saved!.recover() // its decision is checked by C-REC-03
  await flush()
  saved!.fail(new Error('x'))
  await flush()
  assert.deepEqual(reasons, [ 'recover', 'failure' ])
  await shutdown(lifecycle)
})

contract('C-RET-02.c', 'a throwing onStop is reported, but released resources make the failure clean and start() works again', {}, async ({ make }) => {
  const goodbye = new Error('goodbye')
  let released = 0
  const { lifecycle } = make({
    onStart: scope => scope.defer(() => { released++ }),
    onStop () { throw goodbye },
  })
  await lifecycle.start()
  const stopped = observe(lifecycle.stop())
  await flush()
  assert.equal(stopped.error, goodbye)
  const failed = failedState(lifecycle.state)
  assert.equal(failed.phase, 'stop')
  assert.equal(failed.cleanupComplete, true)
  assert.equal(released, 1)
  const restarted = observe(lifecycle.start())
  await flush()
  assert.equal(restarted.status, 'resolved')
  assert.equal(lifecycle.state.kind, 'running')
  await shutdown(lifecycle)
})

contract('C-RET-02.d', 'an onStop that throws undefined is a cleanup failure, and it refuses a restart\'s replacement', {}, async ({ make }) => {
  const a = make({ onStart () {}, onStop () { throw undefined } })
  await a.lifecycle.start()
  const stopped = observe(a.lifecycle.stop())
  await flush()
  assert.equal(stopped.status, 'rejected')
  assert.equal(stopped.error, undefined)
  const failed = failedState(a.lifecycle.state)
  assert.equal(failed.phase, 'stop')
  assert.equal(failed.cleanupComplete, true)
  assert.ok('cleanupError' in failed, 'C-STATE-05: cleanupError is present even when the error is undefined')

  let starts = 0
  const b = make({ onStart () { starts++ }, onStop () { throw undefined } })
  await b.lifecycle.start()
  const restarted = observe(b.lifecycle.restart())
  await flush()
  assert.equal(restarted.status, 'rejected', 'C-RET-06: the replacement is refused')
  assert.equal(starts, 1)
})

contract('C-RET-03.a', 'onStop is not called for a run that never reached running', {}, async ({ make }) => {
  let stops = 0
  const gate = Promise.withResolvers<void>()
  const a = make({ onStart () { throw new Error('x') }, onStop () { stops++ } })
  observe(a.lifecycle.start())
  await flush()
  const b = make({ onStart: () => gate.promise, onStop () { stops++ } })
  const started = observe(b.lifecycle.start())
  await flush()
  const stopped = observe(b.lifecycle.stop())
  gate.resolve()
  await flush()
  assert.equal(stopped.status, 'resolved')
  assert.equal(started.status, 'rejected')
  assert.equal(stops, 0)
})

contract('C-RET-04.b', 'every release runs when one throws, and several errors are reported as an AggregateError', {}, async ({ make }) => {
  const ran: string[] = []
  const { lifecycle } = make({
    onStart (scope) {
      scope.defer(() => { ran.push('a'); throw new Error('a') })
      scope.defer(() => { ran.push('b') })
      scope.defer(() => { ran.push('c'); throw new Error('c') })
    },
  })
  await lifecycle.start()
  const stopped = observe(lifecycle.stop())
  await flush()
  assert.deepEqual(ran, [ 'c', 'b', 'a' ])
  assert.ok(stopped.error instanceof AggregateError)
  assert.deepEqual(stopped.error.errors.map((e: Error) => e.message), [ 'c', 'a' ])
})

contract('C-RET-05.a', 'a stop() during a retry pass joins it and requests no extra pass', {}, async ({ make }) => {
  let saved: { defer (cleanup: () => unknown): void } | undefined
  let calls = 0
  let gate = Promise.withResolvers<void>()
  const { lifecycle } = make({ onStart (scope) { saved = scope } })
  await lifecycle.start()
  await lifecycle.stop()
  assert.throws(() => saved!.defer(async () => {
    calls++
    await gate.promise
    throw new Error('late')
  }), (error: unknown) => errorName(error) === 'LifecycleSupersededError')
  gate.resolve()
  await flush()
  gate = Promise.withResolvers<void>()
  const first = observe(lifecycle.stop())
  await flush()
  const second = observe(lifecycle.stop())
  gate.resolve()
  await flush()
  assert.deepEqual([ first.status, second.status ], [ 'rejected', 'rejected' ], 'both share the failed pass')
  assert.equal(calls, 2, 'one late call and one retry, no unrequested pass')
  assert.equal(failedState(lifecycle.state).cleanupComplete, false)
})

contract('C-RET-06.a', 'a restart() whose retirement leaves cleanup debt rejects its replacement and starts nothing', {}, async ({ make }) => {
  const releaseError = new Error('release')
  const generations: number[] = []
  const { lifecycle } = make({
    onStart (scope) {
      generations.push(scope.generation)
      scope.defer(() => { if (scope.generation === 1) { throw releaseError } })
    },
  })
  await lifecycle.start()
  const restarted = observe(lifecycle.restart())
  await flush()
  assert.equal(restarted.error, releaseError)
  assert.deepEqual(generations, [ 1 ])
  assert.equal(failedState(lifecycle.state).cleanupComplete, false)
})

// ---------------------------------------------------------------------------
// Ported from the Copilot suite (src/async-lifecycle-copilot/async-lifecycle.test.ts)
// ---------------------------------------------------------------------------

for (const value of [ null, false ]) {
  contract(`C-RET-02.e-${String(value)}`, `an onStop that throws ${String(value)} rejects stop() with exactly that value`, {}, async ({ make }) => {
    const { lifecycle } = make({ onStart () {}, onStop () { throw value } })
    await lifecycle.start()
    const stopped = observe(lifecycle.stop())
    await flush()
    assert.equal(stopped.status, 'rejected')
    assert.ok(Object.is(stopped.error, value))
    const failed = failedState(lifecycle.state)
    assert.ok(Object.is(failed.error, value))
    assert.ok(Object.is(failed.cleanupError, value))
  })
}

contract('C-RET-05.b', 'concurrent stop() calls and Symbol.asyncDispose share one retirement pass', {}, async ({ make }) => {
  const gate = Promise.withResolvers<void>()
  let stops = 0
  const { lifecycle } = make({
    onStart () {},
    onStop () {
      stops++
      return gate.promise
    },
  })
  await lifecycle.start()
  const calls = [ observe(lifecycle.stop()), observe(lifecycle.stop()), observe(lifecycle[Symbol.asyncDispose]()) ]
  await flush()
  assert.ok(calls.every(call => call.status === 'pending'))
  gate.resolve()
  await flush()
  assert.ok(calls.every(call => call.status === 'resolved'))
  assert.equal(stops, 1)
  assert.equal(lifecycle.state.kind, 'stopped')
})

contract('C-RET-01.e', 'a task spawned before a resource is joined before that resource is released, whatever the registration order (D9)', {}, async ({ make }) => {
  // Found in review of #2995: a kernel that joins tasks inside the newest-first
  // release pass releases a resource registered after a task before that task
  // has finished its shutdown.
  const log: string[] = []
  const shutdown = Promise.withResolvers<void>()
  const { lifecycle } = make({
    onStart (scope) {
      scope.spawn(async signal => {
        await new Promise<void>(resolve => signal.addEventListener('abort', () => resolve(), { once: true }))
        await shutdown.promise // asynchronous shutdown after the abort
        log.push('task finished')
      })
      scope.defer(() => { log.push('resource released') })
    },
  })
  await lifecycle.start()
  const stopped = observe(lifecycle.stop())
  await flush()
  assert.deepEqual(log, [], 'nothing is released while the task is still shutting down')
  shutdown.resolve()
  await flush()
  assert.deepEqual(log, [ 'task finished', 'resource released' ])
  assert.equal(stopped.status, 'resolved')
})
