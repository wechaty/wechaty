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
 * Contract tests for commands and intent (README §4, C-CMD-*). Each test key
 * starts with the clause it checks; `INVENTORY.md` maps every source test here.
 */

import assert from 'node:assert/strict'

import process from 'node:process'
import { setImmediate } from 'node:timers'

import type { Lifecycle, LifecycleScope } from '../types.ts'
import { errorName, failedState, flush, observe, type Observed, shutdown, stateTrace } from './harness.ts'
import { contract } from './suite.ts'

contract('C-CMD-01.a', 'a pre-aborted caller signal rejects with its reason and starts nothing', {}, async ({ make }) => {
  let starts = 0
  const { lifecycle } = make({ onStart () { starts++ } })
  const started = observe(lifecycle.start({ signal: AbortSignal.abort('pre-aborted') }))
  await flush()
  assert.equal(started.status, 'rejected')
  assert.equal(started.error, 'pre-aborted')
  assert.equal(starts, 0)
  assert.deepEqual(lifecycle.state, { kind: 'stopped', generation: 0 })
})

contract('C-CMD-02.a', 'a caller abort cancels only that wait, with its exact reason, and not the shared start', {}, async ({ make }) => {
  const gate = Promise.withResolvers<void>()
  let starts = 0
  let aborted: boolean | undefined
  const { lifecycle } = make({
    async onStart (scope) {
      starts++
      await gate.promise
      aborted = scope.signal.aborted
    },
  })
  const caller = new AbortController()
  const first = observe(lifecycle.start({ signal: caller.signal }))
  const second = observe(lifecycle.start())
  await flush()
  caller.abort(0) // a falsy reason must survive as itself
  await flush()
  assert.equal(first.status, 'rejected')
  assert.equal(first.error, 0)
  assert.equal(second.status, 'pending')

  gate.resolve()
  await flush()
  assert.equal(second.status, 'resolved')
  assert.equal(aborted, false, 'a caller abort must not abort the generation')
  assert.equal(starts, 1)
  await shutdown(lifecycle)
})

contract('C-CMD-03.a', 'concurrent start() calls share one attempt', {}, async ({ make }) => {
  const gate = Promise.withResolvers<void>()
  let starts = 0
  const { lifecycle } = make({ async onStart () { starts++; await gate.promise } })
  const first = observe(lifecycle.start())
  const second = observe(lifecycle.start())
  await flush()
  gate.resolve()
  await flush()
  assert.equal(first.status, 'resolved')
  assert.equal(second.status, 'resolved')
  assert.equal(starts, 1)
  assert.equal(lifecycle.state.kind, 'running')
  await shutdown(lifecycle)
})

contract('C-CMD-06.a', 'a start() issued while the starting generation aborts waits for it to retire, then starts the next', {}, async ({ make }) => {
  const entered = Promise.withResolvers<void>()
  const release = Promise.withResolvers<void>()
  const scopes: LifecycleScope[] = []
  let replacement: ReturnType<typeof observe<void>> | undefined
  const { lifecycle } = make({
    async onStart (scope) {
      scopes.push(scope)
      if (scopes.length === 1) {
        scope.signal.addEventListener('abort', () => { replacement = observe(lifecycle.start()) }, { once: true })
        entered.resolve()
        await release.promise
      }
    },
  })
  const first = observe(lifecycle.start())
  await entered.promise
  const stopped = observe(lifecycle.stop())
  await flush()
  assert.ok(replacement, 'the abort listener issued start()')
  assert.equal(scopes.length, 1, 'no replacement while the first generation is still retiring')

  release.resolve()
  await flush()
  assert.equal(errorName(first.error), 'LifecycleSupersededError')
  assert.equal(stopped.status, 'resolved')
  assert.equal(replacement.status, 'resolved')
  assert.equal(scopes.length, 2)
  assert.equal(scopes[0]!.signal.aborted, true)
  assert.equal(scopes[1]!.signal.aborted, false)
  assert.deepEqual(lifecycle.state, { kind: 'running', generation: 2 })
  await shutdown(lifecycle)
})

contract('C-CMD-07.a', 'stop() supersedes a pending start, and the late onStart completion never publishes running', {}, async ({ make }) => {
  const gate = Promise.withResolvers<void>()
  const kinds: string[] = []
  const { lifecycle } = make({
    async onStart () { await gate.promise },
    onStateChange (state) { kinds.push(state.kind) },
  })
  const started = observe(lifecycle.start())
  await flush()
  const stopped = observe(lifecycle.stop())
  gate.resolve()
  await flush()
  assert.equal(started.status, 'rejected')
  assert.equal(errorName(started.error), 'LifecycleSupersededError')
  assert.equal(stopped.status, 'resolved')
  assert.equal(lifecycle.state.kind, 'stopped')
  assert.equal(kinds.includes('running'), false)
})

contract('C-CMD-09.a', 'a cleanly failed start can be stopped, then started again', {}, async ({ make }) => {
  let fail = true
  const { lifecycle } = make({ onStart () { if (fail) throw new Error('boom') } })
  // Read through a call: assert.equal() narrows `lifecycle.state` in TypeScript,
  // but this test checks it changing from one assertion to the next.
  const kind = () => lifecycle.state.kind
  const first = observe(lifecycle.start())
  await flush()
  assert.equal(first.status, 'rejected')
  assert.equal(kind(), 'failed')

  const stopped = observe(lifecycle.stop())
  await flush()
  assert.equal(stopped.status, 'resolved')
  assert.equal(kind(), 'stopped')

  fail = false
  const second = observe(lifecycle.start())
  await flush()
  assert.equal(second.status, 'resolved')
  assert.equal(kind(), 'running')
  await shutdown(lifecycle)
})

contract('C-CMD-11.a', 'restart() superseded by a later stop() rejects, and the lifecycle ends stopped', {}, async ({ make }) => {
  const { lifecycle } = make({ onStart () {} })
  await lifecycle.start()
  const restarted = observe(lifecycle.restart())
  const stopped = observe(lifecycle.stop())
  await flush()
  assert.equal(errorName(restarted.error), 'LifecycleSupersededError')
  assert.equal(stopped.status, 'resolved')
  assert.equal(lifecycle.state.kind, 'stopped')
})

contract('C-CMD-11.b', 'restart() during startup retires the interrupted hook before the replacement starts, with no onStop', {}, async ({ make }) => {
  // Codex source test expected an onStop here; D8 says no onStop for a run that never reached running.
  const entered = Promise.withResolvers<void>()
  const trace: string[] = []
  let starts = 0
  const { lifecycle } = make({
    async onStart (scope) {
      trace.push(`start ${++starts}`)
      if (starts === 1) {
        entered.resolve()
        await new Promise<void>(resolve => scope.signal.addEventListener('abort', () => resolve(), { once: true }))
        trace.push('first start interrupted')
      }
    },
    onStop () { trace.push('stop') },
  })
  const first = observe(lifecycle.start())
  await entered.promise
  const restarted = observe(lifecycle.restart())
  await flush()
  assert.equal(errorName(first.error), 'LifecycleSupersededError', 'C-CMD-11: restart during starting supersedes start() callers')
  assert.equal(restarted.status, 'resolved')
  assert.deepEqual(trace, [ 'start 1', 'first start interrupted', 'start 2' ])
  await shutdown(lifecycle)
})

contract('C-CMD-11.c', 'restart() retires the running generation gracefully before a start() that joins the replacement', {}, async ({ make }) => {
  const trace: string[] = []
  let current: LifecycleScope | undefined
  const { lifecycle } = make({
    onStart (scope) {
      current = scope
      trace.push('start')
      scope.defer(() => { trace.push('release') })
    },
    onStop () {
      trace.push(`stop (signal aborted: ${current!.signal.aborted})`)
    },
  })
  await lifecycle.start()
  const generation = lifecycle.state.generation
  const restarted = observe(lifecycle.restart())
  const joined = observe(lifecycle.start())
  await flush()
  assert.equal(restarted.status, 'resolved')
  assert.equal(joined.status, 'resolved')
  assert.deepEqual(trace, [ 'start', 'stop (signal aborted: false)', 'release', 'start' ])
  assert.equal(lifecycle.state.generation, generation + 1)
  await shutdown(lifecycle)
})

contract('C-CMD-16.a', 'a throwing whenState predicate rejects only its own wait', {}, async ({ make }) => {
  const { lifecycle } = make({ onStart () {} })
  const bad = observe(lifecycle.whenState(() => { throw new Error('predicate failed') }))
  const good = observe(lifecycle.whenState(state => state.kind === 'running'))
  await flush()
  assert.equal(bad.status, 'rejected')
  assert.match(String((bad.error as Error).message), /predicate failed/)

  await lifecycle.start()
  await flush()
  assert.equal(good.status, 'resolved')
  await shutdown(lifecycle)
})

// ---------------------------------------------------------------------------
// Ported from the Claude suite (src/async-lifecycle-claude/engine.test.ts)
// ---------------------------------------------------------------------------

contract('C-CMD-01.b', 'a pre-aborted signal rejects restart, stop, whenState and condition waits too, accepting nothing', {}, async ({ make }) => {
  let starts = 0
  const subject = make({ onStart () { starts++ } })
  const signal = AbortSignal.abort(new Error('pre-aborted'))
  const calls = ([
    subject.lifecycle.restart({ signal }),
    subject.lifecycle.stop({ signal }),
    subject.lifecycle.whenState(() => true, { signal }),
    subject.condition('ready').wait({ signal }),
  ] as Array<Promise<unknown>>).map(call => observe(call))
  await flush()
  for (const call of calls) {
    assert.equal(call.status, 'rejected')
    assert.equal((call.error as Error).message, 'pre-aborted')
  }
  assert.equal(starts, 0)
  assert.deepEqual(subject.lifecycle.state, { kind: 'stopped', generation: 0 })
})

contract('C-CMD-02.b', 'a caller abort fired while its command aborts a starting run rejects that caller, and the stop still happens', {}, async ({ make }) => {
  const gate = Promise.withResolvers<void>()
  const caller = new AbortController()
  const callerAbort = new Error('caller')
  const { lifecycle } = make({
    onStart (scope) {
      scope.signal.addEventListener('abort', () => caller.abort(callerAbort))
      return gate.promise
    },
  })
  const started = observe(lifecycle.start())
  await flush()
  const stopped = observe(lifecycle.stop({ signal: caller.signal }))
  await flush()
  assert.equal(stopped.error, callerAbort)
  gate.resolve()
  await flush()
  assert.equal(started.status, 'rejected')
  assert.equal(lifecycle.state.kind, 'stopped', 'the accepted stop still ran')
})

contract('C-CMD-02.c', 'a caller that aborted early never leaves a later cleanup failure as an unhandled rejection', {}, async ({ make }) => {
  const unhandled: unknown[] = []
  const onUnhandled = (reason: unknown) => { unhandled.push(reason) }
  process.on('unhandledRejection', onUnhandled)
  try {
    const gate = Promise.withResolvers<void>()
    const caller = new AbortController()
    const cleanupError = new Error('cleanup')
    const { lifecycle } = make({
      onStart (scope) {
        scope.defer(() => { throw cleanupError })
        scope.signal.addEventListener('abort', () => caller.abort(new Error('caller')))
        return gate.promise
      },
    })
    observe(lifecycle.start())
    await flush()
    const stopped = observe(lifecycle.stop({ signal: caller.signal }))
    gate.resolve()
    await flush()
    assert.equal(stopped.status, 'rejected')
    assert.equal(failedState(lifecycle.state).cleanupError, cleanupError)
    // Unhandled rejections are reported at the next macrotask; no real time passes.
    await new Promise(resolve => setImmediate(resolve))
    assert.deepEqual(unhandled, [])
  } finally {
    process.off('unhandledRejection', onUnhandled)
  }
})

contract('C-CMD-03.b', 'concurrent restart() calls share one replacement', {}, async ({ make }) => {
  let starts = 0
  const { lifecycle } = make({ onStart () { starts++ } })
  await lifecycle.start()
  const both = [ observe(lifecycle.restart()), observe(lifecycle.restart()) ]
  await flush()
  assert.deepEqual(both.map(call => call.status), [ 'resolved', 'resolved' ])
  assert.equal(starts, 2)
  assert.deepEqual(lifecycle.state, { kind: 'running', generation: 2 })
  await shutdown(lifecycle)
})

contract('C-CMD-04.a', 'start() while running resolves at once and starts nothing (#2905 A)', {}, async ({ make }) => {
  let starts = 0
  const { lifecycle } = make({ onStart () { starts++ } })
  await lifecycle.start()
  const again = observe(lifecycle.start())
  await flush()
  assert.equal(again.status, 'resolved')
  assert.equal(starts, 1)
  assert.equal(lifecycle.state.generation, 1)
  await shutdown(lifecycle)
})

contract('C-CMD-06.b', 'two start()s queued behind an in-flight stop() run one onStart, never two at once (#2905 A)', {}, async ({ make }) => {
  let active = 0
  let maxActive = 0
  let starts = 0
  const gate = Promise.withResolvers<void>()
  const { lifecycle } = make({
    async onStart () {
      starts++
      active++
      maxActive = Math.max(maxActive, active)
      await flush(5)
      active--
    },
    onStop: () => gate.promise,
  })
  await lifecycle.start()
  const stopped = observe(lifecycle.stop())
  const a = observe(lifecycle.start())
  const b = observe(lifecycle.start())
  gate.resolve()
  await flush()
  assert.deepEqual([ stopped.status, a.status, b.status ], [ 'resolved', 'resolved', 'resolved' ])
  assert.equal(starts, 2)
  assert.equal(maxActive, 1)
  assert.deepEqual(lifecycle.state, { kind: 'running', generation: 2 })
  await shutdown(lifecycle)
})

contract('C-CMD-06.c', 'stop() then start() during a gated onStart starts a fresh generation; the first never runs', {}, async ({ make }) => {
  const trace = stateTrace()
  const gate = Promise.withResolvers<void>()
  const { lifecycle } = make({
    onStart: scope => scope.generation === 1 ? gate.promise : undefined,
    onStateChange: trace.onStateChange,
  })
  const first = observe(lifecycle.start())
  await flush()
  observe(lifecycle.stop())
  const second = observe(lifecycle.start())
  gate.resolve()
  await flush()
  assert.equal(errorName(first.error), 'LifecycleSupersededError')
  assert.equal(second.status, 'resolved')
  assert.deepEqual(lifecycle.state, { kind: 'running', generation: 2 })
  assert.equal(trace.kinds.includes('running:1'), false)
  await shutdown(lifecycle)
})

contract('C-CMD-07.b', 'stop() aborts an abort-aware onStart without waiting for it (#2905 C)', {}, async ({ make }) => {
  // The Claude source test also required the abort to happen synchronously
  // inside stop(). The contract requires only that intent is accepted
  // synchronously (C-CMD-01), so this test checks the abort before onStart settles.
  const trace = stateTrace()
  let saved: LifecycleScope | undefined
  const { lifecycle } = make({
    onStart: scope => new Promise<void>((_resolve, reject) => {
      saved = scope
      scope.signal.addEventListener('abort', () => reject(scope.signal.reason))
    }),
    onStateChange: trace.onStateChange,
  })
  const started = observe(lifecycle.start())
  await flush()
  const stopped = observe(lifecycle.stop())
  await flush()
  assert.equal(saved!.signal.aborted, true, 'the abort is what made the abort-aware onStart settle')
  assert.equal(stopped.status, 'resolved')
  assert.equal(errorName(started.error), 'LifecycleSupersededError')
  assert.deepEqual(trace.kinds, [ 'starting:1', 'stopping:1', 'stopped:1' ])
})

contract('C-CMD-07.c', 'stop() waits for an onStart that ignores abort, and its late success never publishes running (#2905 C)', {}, async ({ make }) => {
  const trace = stateTrace()
  const gate = Promise.withResolvers<void>()
  const { lifecycle } = make({ onStart: () => gate.promise, onStateChange: trace.onStateChange })
  const started = observe(lifecycle.start())
  await flush()
  const stopped = observe(lifecycle.stop())
  await flush()
  assert.equal(lifecycle.state.kind, 'stopping')
  assert.equal(stopped.status, 'pending', 'C-RET-01 step 5: stop waits for onStart to settle')
  gate.resolve()
  await flush()
  assert.equal(errorName(started.error), 'LifecycleSupersededError')
  assert.equal(stopped.status, 'resolved')
  assert.equal(trace.kinds.includes('running:1'), false)
  assert.equal(lifecycle.state.kind, 'stopped')
})

contract('C-CMD-10.a', 'a failed release leaves a dirty failure that refuses start() and restart(), and stop() retries only that release', {}, async ({ make }) => {
  const releaseError = new Error('release')
  let attempts = 0
  let other = 0
  let stops = 0
  const { lifecycle } = make({
    onStart (scope) {
      scope.defer(() => { other++ })
      scope.defer(() => { if (++attempts === 1) { throw releaseError } })
    },
    onStop () { stops++ },
  })
  await lifecycle.start()
  const stopped = observe(lifecycle.stop())
  await flush()
  assert.equal(stopped.error, releaseError)
  const failed = failedState(lifecycle.state)
  assert.equal(failed.phase, 'stop')
  assert.equal(failed.cleanupComplete, false)
  assert.equal(failed.cleanupError, releaseError)

  const refused = [ observe(lifecycle.start()), observe(lifecycle.restart()) ]
  await flush()
  for (const call of refused) {
    assert.equal(errorName(call.error), 'LifecycleUnsafeStateError', 'C-CMD-13')
  }

  const retried = observe(lifecycle.stop())
  await flush()
  assert.equal(retried.status, 'resolved')
  assert.equal(lifecycle.state.kind, 'stopped')
  assert.equal(attempts, 2, 'only the failed release is retried')
  assert.equal(other, 1)
  assert.equal(stops, 1, 'a successful onStop is not replayed')
})

contract('C-CMD-10.b', 'a release that keeps failing runs once per explicit stop(), and never on its own', {}, async ({ make }) => {
  let calls = 0
  const { lifecycle } = make({ onStart: scope => scope.defer(() => { calls++; throw new Error('always') }) })
  await lifecycle.start()
  observe(lifecycle.stop())
  await flush()
  assert.equal(calls, 1)
  await flush()
  assert.equal(calls, 1, 'no automatic retry')
  observe(lifecycle.stop())
  await flush()
  assert.equal(calls, 2)
  assert.equal(failedState(lifecycle.state).cleanupComplete, false)
})

contract('C-CMD-10.c', 'a stop() that supersedes a gated start releases once, and stays dirty until stop() is called again', {}, async ({ make }) => {
  const releaseError = new Error('release')
  const gate = Promise.withResolvers<void>()
  let calls = 0
  const { lifecycle } = make({
    async onStart (scope) {
      scope.defer(() => { if (++calls === 1) { throw releaseError } })
      await gate.promise
    },
  })
  const started = observe(lifecycle.start())
  await flush()
  const stopped = observe(lifecycle.stop())
  gate.resolve()
  await flush()
  assert.equal(stopped.error, releaseError)
  assert.equal(errorName(started.error), 'LifecycleSupersededError')
  assert.equal(calls, 1)
  assert.equal(failedState(lifecycle.state).cleanupComplete, false)

  const again = observe(lifecycle.stop())
  await flush()
  assert.equal(again.status, 'resolved')
  assert.equal(calls, 2)
  assert.equal(lifecycle.state.kind, 'stopped')
})

contract('C-CMD-11.d', 'restart() goes running, stopping, starting, running, with onStop reason `restart`', { needs: [ 'onStop.context' ] }, async ({ make }) => {
  const trace = stateTrace()
  const reasons: string[] = []
  const { lifecycle } = make({
    onStart () {},
    onStop (stop) { reasons.push(stop.reason) },
    onStateChange: trace.onStateChange,
  })
  await lifecycle.start()
  await lifecycle.restart()
  assert.deepEqual(trace.kinds, [ 'starting:1', 'running:1', 'stopping:1', 'starting:2', 'running:2' ])
  assert.deepEqual(reasons, [ 'restart' ])
  await shutdown(lifecycle)
})

contract('C-CMD-11.e', 'a start() from an abort listener during restart() joins the replacement', {}, async ({ make }) => {
  const gate = Promise.withResolvers<void>()
  let lifecycle!: Lifecycle
  let joined: ReturnType<typeof observe<void>> | undefined
  ;({ lifecycle } = make({
    onStart (scope) {
      if (scope.generation === 1) {
        scope.signal.addEventListener('abort', () => { joined = observe(lifecycle.start()) })
        return gate.promise
      }
      return undefined
    },
  }))
  const first = observe(lifecycle.start())
  await flush()
  const restarted = observe(lifecycle.restart())
  gate.resolve()
  await flush()
  assert.equal(errorName(first.error), 'LifecycleSupersededError')
  assert.equal(restarted.status, 'resolved')
  assert.equal(joined?.status, 'resolved')
  assert.deepEqual(lifecycle.state, { kind: 'running', generation: 2 })
  await shutdown(lifecycle)
})

contract('C-CMD-11.f', 'a stop() from an abort listener during restart() supersedes the restart', {}, async ({ make }) => {
  const gate = Promise.withResolvers<void>()
  let lifecycle!: Lifecycle
  ;({ lifecycle } = make({
    onStart (scope) {
      if (scope.generation === 1) {
        scope.signal.addEventListener('abort', () => { observe(lifecycle.stop()) })
        return gate.promise
      }
      return undefined
    },
  }))
  const first = observe(lifecycle.start())
  await flush()
  const restarted = observe(lifecycle.restart())
  gate.resolve()
  await flush()
  assert.equal(first.status, 'rejected')
  assert.equal(errorName(restarted.error), 'LifecycleSupersededError')
  assert.equal(lifecycle.state.kind, 'stopped')
})

contract('C-CMD-11.g', 'restart() then stop() ends stopped; restart() then start() does not hang', {}, async ({ make }) => {
  const { lifecycle } = make({ onStart () {} })
  await lifecycle.start()
  const restarted = observe(lifecycle.restart())
  const stopped = observe(lifecycle.stop())
  await flush()
  assert.equal(stopped.status, 'resolved')
  assert.equal(errorName(restarted.error), 'LifecycleSupersededError')
  assert.equal(lifecycle.state.kind, 'stopped')

  await lifecycle.start()
  const again = observe(lifecycle.restart())
  const joined = observe(lifecycle.start())
  await flush()
  assert.deepEqual([ again.status, joined.status ], [ 'resolved', 'resolved' ])
  assert.deepEqual(lifecycle.state, { kind: 'running', generation: 3 })
  await shutdown(lifecycle)
})

contract('C-CMD-12.a', 'restart() from stopped behaves like start()', {}, async ({ make }) => {
  const { lifecycle } = make({ onStart () {} })
  const restarted = observe(lifecycle.restart())
  await flush()
  assert.equal(restarted.status, 'resolved')
  assert.deepEqual(lifecycle.state, { kind: 'running', generation: 1 })
  await shutdown(lifecycle)
})

contract('C-CMD-14.a', 'a failed onStart publishes failed { start } and is not retried; the next start() runs a new generation (#2905 D)', {}, async ({ make }) => {
  const boom = new Error('boom')
  let starts = 0
  const { lifecycle } = make({ onStart () { if (++starts === 1) { throw boom } } })
  const first = observe(lifecycle.start())
  await flush()
  assert.equal(first.error, boom)
  const failed = failedState(lifecycle.state)
  assert.equal(failed.phase, 'start')
  assert.equal(failed.error, boom)
  assert.equal(failed.cleanupComplete, true)
  await flush()
  assert.equal(starts, 1, 'a failed attempt ends')

  const second = observe(lifecycle.start())
  await flush()
  assert.equal(second.status, 'resolved')
  assert.deepEqual(lifecycle.state, { kind: 'running', generation: 2 })
  await shutdown(lifecycle)
})

contract('C-CMD-15.a', '`await using` stops the lifecycle when the block exits', {}, async ({ make }) => {
  let stops = 0
  const { lifecycle } = make({ onStart () {}, onStop () { stops++ } })
  {
    await using owned = lifecycle
    await owned.start()
  }
  assert.equal(stops, 1)
  assert.equal(lifecycle.state.kind, 'stopped')
})

contract('C-CMD-16.b', 'whenState() resolves at once, on a later snapshot, or rejects when its predicate throws', {}, async ({ make }) => {
  const { lifecycle } = make({ onStart () {} })
  const now = observe(lifecycle.whenState(state => state.kind === 'stopped'))
  const running = observe(lifecycle.whenState(state => state.kind === 'running'))
  await flush()
  assert.equal(now.value?.kind, 'stopped')
  await lifecycle.start()
  await flush()
  assert.deepEqual(running.value, { kind: 'running', generation: 1 })

  const throwing = observe(lifecycle.whenState(state => {
    if (state.kind === 'stopping') {
      throw new Error('predicate')
    }
    return false
  }))
  await lifecycle.stop()
  await flush()
  assert.match(String((throwing.error as Error).message), /predicate/)
})

contract('C-CMD-16.c', 'a caller abort rejects whenState() without affecting the lifecycle', {}, async ({ make }) => {
  const { lifecycle } = make({ onStart () {} })
  const caller = new AbortController()
  const waiting = observe(lifecycle.whenState(state => state.kind === 'failed', { signal: caller.signal }))
  caller.abort(new Error('bye'))
  await flush()
  assert.match(String((waiting.error as Error).message), /bye/)
  await lifecycle.start()
  assert.equal(lifecycle.state.kind, 'running')
  await shutdown(lifecycle)
})

contract('C-CMD-16.d', 'whenState() rejects when its first predicate call aborts the caller', {}, async ({ make }) => {
  const { lifecycle } = make({ onStart () {} })
  const caller = new AbortController()
  const reason = new Error('caller')
  const waiting = observe(lifecycle.whenState(() => { caller.abort(reason); return false }, { signal: caller.signal }))
  await flush()
  assert.equal(waiting.error, reason)
})

// ---------------------------------------------------------------------------
// Accepted decisions D30 to D37 (#2968 §6)
// ---------------------------------------------------------------------------

contract('C-CMD-17.a', 'a failed start rejects while its cleanup is still running, not after it (D35)', {}, async ({ make }) => {
  const failure = new Error('onStart failed')
  const cleanup = Promise.withResolvers<void>()
  const { lifecycle } = make({
    onStart (scope) {
      scope.defer(() => cleanup.promise)
      throw failure
    },
  })
  const started = observe(lifecycle.start())
  await flush()
  assert.equal(started.status, 'rejected', 'the caller learns of the failure before cleanup finishes')
  assert.equal(started.error, failure)
  assert.equal(lifecycle.state.kind, 'stopping')
  cleanup.resolve()
  await flush()
  assert.equal(failedState(lifecycle.state).error, failure)
})

// ---------------------------------------------------------------------------
// Ported from the Copilot suite (src/async-lifecycle-copilot/async-lifecycle.test.ts)
// ---------------------------------------------------------------------------

contract('C-CMD-16.e', 'whenState() resolves with the snapshot its first predicate call inspected, even if that predicate starts the lifecycle', {}, async ({ make }) => {
  const { lifecycle } = make({ onStart () {} })
  const starts: Observed<void>[] = []
  const seen = observe(lifecycle.whenState(state => {
    starts.push(observe(lifecycle.start()))
    return state.kind === 'stopped'
  }))
  await flush()
  assert.deepEqual(seen.value, { kind: 'stopped', generation: 0 }, 'not the `starting` snapshot the start() produced')
  assert.equal(lifecycle.state.kind, 'running')
  assert.ok(starts.every(start => start.status === 'resolved'))
  await shutdown(lifecycle)
})

contract('C-CMD-13.a', 'a failed start whose rollback fails leaves failed { start, cleanupComplete: false }: start() and restart() are refused, and stop() retries the release', {}, async ({ make }) => {
  const startError = new Error('startup')
  const cleanupError = new Error('first cleanup')
  let calls = 0
  const { lifecycle } = make({
    onStart (scope) {
      scope.defer(() => { if (++calls === 1) { throw cleanupError } })
      throw startError
    },
  })
  const started = observe(lifecycle.start())
  await flush()
  assert.equal(started.error, startError)
  const failed = failedState(lifecycle.state)
  assert.equal(failed.phase, 'start')
  assert.equal(failed.error, startError)
  assert.equal(failed.cleanupComplete, false)
  assert.equal(failed.cleanupError, cleanupError)

  const refused = [ observe(lifecycle.start()), observe(lifecycle.restart()) ]
  await flush()
  for (const command of refused) {
    assert.equal(errorName(command.error), 'LifecycleUnsafeStateError')
  }
  assert.equal(calls, 1, 'a refused command changes nothing')

  const stopped = observe(lifecycle.stop())
  await flush()
  assert.equal(stopped.status, 'resolved')
  assert.equal(calls, 2)
  assert.deepEqual(lifecycle.state, { kind: 'stopped', generation: 1 })
})

// ---------------------------------------------------------------------------
// From the acceptance lists: v1 design §6, #2911 §9 and the ChatGPT review §7
// ---------------------------------------------------------------------------

contract('C-CMD-08.a', 'stop() resolves when the generation it captured is released, while a newer start() is still starting', {}, async ({ make }) => {
  const stopGate = Promise.withResolvers<void>()
  const startGate = Promise.withResolvers<void>()
  let starts = 0
  const { lifecycle } = make({
    onStart: () => (++starts === 2 ? startGate.promise : undefined),
    onStop: () => stopGate.promise,
  })
  await lifecycle.start()
  const stopped = observe(lifecycle.stop())
  const started = observe(lifecycle.start())
  await flush()
  assert.equal(stopped.status, 'pending')
  stopGate.resolve()
  await flush()
  assert.equal(stopped.status, 'resolved', 'it does not wait for the queued start')
  assert.deepEqual(lifecycle.state, { kind: 'starting', generation: 2 })
  assert.equal(started.status, 'pending')
  startGate.resolve()
  await flush()
  assert.equal(started.status, 'resolved')
  await shutdown(lifecycle)
})

// ---------------------------------------------------------------------------
// Rules that had no test of their own (S2 exit criteria)
// ---------------------------------------------------------------------------

contract('C-CMD-05.a', 'start() while `starting` joins that attempt and never aborts it', {}, async ({ make }) => {
  const gate = Promise.withResolvers<void>()
  let saved: LifecycleScope | undefined
  let starts = 0
  const { lifecycle } = make({
    onStart (scope) {
      starts++
      saved = scope
      return gate.promise
    },
  })
  const first = observe(lifecycle.start())
  await flush()
  const second = observe(lifecycle.start())
  await flush()
  assert.equal(starts, 1)
  assert.equal(saved!.signal.aborted, false, 'joining never aborts the attempt')
  gate.resolve()
  await flush()
  assert.deepEqual([ first.status, second.status ], [ 'resolved', 'resolved' ])
  assert.deepEqual(lifecycle.state, { kind: 'running', generation: 1 })
  await shutdown(lifecycle)
})

// ---------------------------------------------------------------------------
// Found by the S3 random schedules (random/random.test.ts)
// ---------------------------------------------------------------------------

contract('C-CMD-07.d', 'a stop() accepted at any moment while a stopped generation finishes retiring supersedes the start() queued behind it, and the instance can still be stopped afterwards (B13)', {}, async ({ make }) => {
  // The window is a few microtasks wide and its position depends on the
  // kernel's promise chain, so the delay before stop() is swept, as in
  // C-TIME-05.d.
  for (let turns = 0; turns <= 60; turns++) {
    const gate = Promise.withResolvers<void>()
    let starts = 0
    const { lifecycle } = make({
      onStart: () => (++starts === 1 ? gate.promise : undefined),
      onStop () {},
    })
    observe(lifecycle.start())
    await flush()
    observe(lifecycle.stop())
    await flush()
    const queued = observe(lifecycle.start())
    await flush()
    gate.resolve()
    await flush(turns)
    // Decided from the committed state: an observed promise settles a microtask late.
    const pending = !(lifecycle.state.kind === 'running' && lifecycle.state.generation === 2)
    const stopped = observe(lifecycle.stop())
    await flush()
    await flush()
    assert.equal(stopped.status, 'resolved', `turn ${turns}`)
    assert.equal(lifecycle.state.kind, 'stopped', `turn ${turns}: the resolved stop() left ${lifecycle.state.kind}(${lifecycle.state.generation})`)
    if (pending) {
      assert.equal(errorName(queued.error), 'LifecycleSupersededError', `turn ${turns}: the stop() supersedes the start() still pending (C-CMD-07)`)
    }
  }
})
