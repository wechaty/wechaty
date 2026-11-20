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
 * Contract tests for late releases: cleanups registered on a scope whose
 * generation has already been released (README C-SCOPE-11, decision D31).
 *
 * Most are ported from the Codex suite's "detached release" tests, written
 * against C-SCOPE-11 instead of the Codex kernel's private bookkeeping. A late
 * registration always throws the retirement reason (C-SCOPE-02); each test
 * asserts that with `registerLate()`.
 */

import assert from 'node:assert/strict'

import type { LifecycleScope, LifecycleState } from '../types.ts'
import { errorName, failedState, flush, ManualClock, observe, shutdown, stateTrace } from './harness.ts'
import type { MakeSubject } from './subject.ts'
import { contract } from './suite.ts'

/**
 * Register `cleanup` on a retired scope, asserting the late registration throws
 * the retirement reason (C-SCOPE-02): the generation's failure when one is
 * given, otherwise a `LifecycleSupersededError`.
 */
function registerLate (scope: LifecycleScope, cleanup: () => unknown, failure?: Error): void {
  assert.throws(() => scope.defer(cleanup), (error: unknown) => failure ? error === failure : errorName(error) === 'LifecycleSupersededError')
}

/**
 * Start an instance that ends idle in `from`: `stopped` after a clean run, or a
 * clean `failed { phase: 'start' }` after `onStart` threw. Returns the retired
 * generation's scope, on which a test registers its late release.
 */
async function idleInstance (make: MakeSubject, from: 'stopped' | 'failed', onStateChange?: (state: LifecycleState) => void) {
  let retired: LifecycleScope | undefined
  const failure = new Error('onStart failed')
  const { lifecycle } = make({
    onStart (scope) {
      retired = scope
      if (from === 'failed') {
        throw failure
      }
    },
    onStateChange,
  })
  if (from === 'failed') {
    const started = observe(lifecycle.start())
    await flush()
    assert.equal(started.error, failure)
    assert.equal(failedState(lifecycle.state).cleanupComplete, true)
  } else {
    await lifecycle.start()
    await lifecycle.stop()
  }
  return { lifecycle, retired: retired!, failure }
}

for (const from of [ 'stopped', 'failed' ] as const) {
  contract(`C-SCOPE-11.a-${from}`, `on an idle instance the state is \`stopping\` while a late release runs, then the ${from === 'stopped' ? '`stopped`' : 'same clean `failed`'} it left (D31)`, {}, async ({ make }) => {
    const trace = stateTrace()
    const gate = Promise.withResolvers<void>()
    const { lifecycle, retired, failure } = await idleInstance(make, from, trace.onStateChange)
    registerLate(retired, () => gate.promise, from === 'failed' ? failure : undefined)
    await flush()
    assert.equal(lifecycle.state.kind, 'stopping', `\`${from}\` would claim everything was released (C-STATE-07)`)
    gate.resolve()
    await flush()
    if (from === 'stopped') {
      assert.deepEqual(lifecycle.state, { kind: 'stopped', generation: 1 })
    } else {
      // Only stop() turns a clean failure into `stopped` (C-CMD-09); the
      // failure stays visible to a supervisor deciding whether to restart.
      const state = failedState(lifecycle.state)
      assert.equal(state.generation, 1)
      assert.equal(state.phase, 'start')
      assert.equal(state.error, failure)
      assert.equal(state.cleanupComplete, true)
      assert.equal(state.cleanupError, undefined)
    }
    assert.deepEqual(trace.kinds.slice(-3), [ `${from}:1`, 'stopping:1', `${from}:1` ])
  })

  contract(`C-SCOPE-11.b-${from}`, `a late release that fails on an idle instance (${from}) leaves failed { cleanupComplete: false } until stop() retries it (D31)`, {}, async ({ make }) => {
    const reason = new Error('late release failed')
    let calls = 0
    const { lifecycle, retired, failure } = await idleInstance(make, from)
    registerLate(retired, () => { if (++calls === 1) { throw reason } }, from === 'failed' ? failure : undefined)
    await flush()
    const failed = failedState(lifecycle.state)
    assert.equal(failed.generation, 1)
    // From `stopped` the release error is the failure; from a clean `failed`
    // the earlier failure stays the reported one (the first failure wins).
    assert.equal(failed.phase, from === 'stopped' ? 'stop' : 'start')
    assert.equal(failed.error, from === 'stopped' ? reason : failure)
    assert.equal(failed.cleanupComplete, false)
    assert.equal(failed.cleanupError, reason)
    const final = await shutdown(lifecycle)
    assert.equal(final.status, 'resolved')
    assert.equal(calls, 2)
    assert.equal(lifecycle.state.kind, 'stopped')
  })
}

for (const completion of [ 'already released', 'release', 'reject', 'stop', 'timeout' ] as const) {
  contract(`C-SCOPE-11.c-${completion.replace(' ', '-')}`, `a new generation does not commit running until a late release finishes: ${completion} (D31)`, { needs: completion === 'timeout' ? [ 'clock' ] : [] }, async ({ make }) => {
    const clock = new ManualClock()
    const gate = Promise.withResolvers<void>()
    const reason = new Error('older release failed')
    const running: number[] = []
    let old: LifecycleScope | undefined
    let releases = 0
    const { lifecycle } = make({
      onStart (scope) {
        if (!old) {
          old = scope
          return
        }
        registerLate(old, () => (++releases === 1 ? gate.promise : undefined))
        if (completion === 'already released') {
          gate.resolve()
        }
      },
      onStateChange (state) { if (state.kind === 'running') { running.push(state.generation) } },
    }, { clock, startTimeoutMs: completion === 'timeout' ? 50 : undefined })
    await lifecycle.start()
    const started = observe(lifecycle.restart())
    await flush()

    if (completion === 'already released') {
      assert.equal(started.status, 'resolved')
    } else if (completion === 'timeout') {
      assert.deepEqual(lifecycle.state, { kind: 'starting', generation: 2 })
      await clock.advance(50)
      assert.equal(errorName(started.error), 'LifecycleTimeoutError', 'the wait counts against the start deadline')
      gate.resolve()
      await flush()
    } else {
      assert.deepEqual(lifecycle.state, { kind: 'starting', generation: 2 }, 'running waits for the late release')
      if (completion === 'release') {
        gate.resolve()
        await flush()
        assert.equal(started.status, 'resolved')
      } else if (completion === 'reject') {
        gate.reject(reason)
        await flush()
        assert.equal(started.error, reason)
        assert.equal(failedState(lifecycle.state).cleanupComplete, false)
      } else {
        const stopped = observe(lifecycle.stop())
        await flush()
        assert.equal(errorName(started.error), 'LifecycleSupersededError')
        gate.resolve()
        await flush()
        assert.equal(stopped.status, 'resolved')
      }
    }
    assert.deepEqual(running, completion === 'release' || completion === 'already released' ? [ 1, 2 ] : [ 1 ])
    await shutdown(lifecycle)
    assert.equal(releases, completion === 'reject' ? 2 : 1)
  })
}

contract('C-SCOPE-11.d', 'a restart() queued behind a late release that fails rejects with that error and never commits its replacement (D31)', {}, async ({ make }) => {
  const trace = stateTrace()
  let retired: LifecycleScope | undefined
  let releases = 0
  const reason = new Error('older cleanup failed')
  const gate = Promise.withResolvers<void>()
  const { lifecycle } = make({ onStart (scope) { retired ??= scope }, onStateChange: trace.onStateChange })
  await lifecycle.start()
  await lifecycle.restart()
  registerLate(retired!, () => (++releases === 1 ? gate.promise : undefined))
  const replacement = observe(lifecycle.restart())
  await flush()
  gate.reject(reason)
  await flush()
  assert.equal(replacement.error, reason)
  assert.equal(failedState(lifecycle.state).cleanupComplete, false)
  assert.equal(trace.kinds.includes('running:3'), false)
  const final = await shutdown(lifecycle)
  assert.equal(final.status, 'resolved')
  assert.equal(releases, 2)
})

for (const command of [ 'stop', 'fail' ] as const) {
  contract(`C-SCOPE-11.e-${command}`, `${command === 'stop' ? 'stop()' : 'a run failure'} retires the live generation even while a late release is blocked (D31)`, {}, async ({ make }) => {
    const scopes: LifecycleScope[] = []
    let released = false
    const gate = Promise.withResolvers<void>()
    const { lifecycle } = make({
      onStart (scope) {
        scopes.push(scope)
        if (scopes.length === 2) {
          scope.defer(() => { released = true })
        }
      },
    })
    await lifecycle.start()
    await lifecycle.restart()
    registerLate(scopes[0]!, () => gate.promise)
    await flush()
    const stopped = command === 'stop' ? observe(lifecycle.stop()) : undefined
    if (command === 'fail') {
      scopes[1]!.fail(new Error('lost connection'))
    }
    await flush()
    assert.equal(released, true, 'the live generation released its resources')
    assert.equal(scopes[1]!.signal.aborted, true)
    gate.resolve()
    await flush()
    if (stopped) {
      assert.equal(stopped.status, 'resolved')
    }
    await shutdown(lifecycle)
  })
}

for (const command of [ 'stop', 'restart' ] as const) {
  for (const retry of [ 'succeeds', 'fails' ] as const) {
    contract(`C-SCOPE-11.f-${command}-${retry}`, `a late release that fails while a generation is running leaves it running; ${command}() retries the debt, which ${retry} (D31)`, {}, async ({ make }) => {
      // Ported from the Claude suite ("debt from a retired generation is retried
      // by the next retirement"). A live run is not taken down by an earlier
      // generation's cleanup; its own retirement carries the debt.
      const trace = stateTrace()
      const reason = new Error('late')
      let first: LifecycleScope | undefined
      let calls = 0
      const { lifecycle } = make({ onStart (scope) { first ??= scope }, onStateChange: trace.onStateChange })
      await lifecycle.start()
      await lifecycle.stop()
      await lifecycle.start()
      const commits = trace.kinds.length
      registerLate(first!, () => { if (++calls <= (retry === 'fails' ? 2 : 1)) { throw reason } })
      await flush()
      assert.deepEqual(lifecycle.state, { kind: 'running', generation: 2 }, 'a live run is not interrupted by old debt')
      assert.equal(trace.kinds.length, commits, 'the failure commits nothing')
      assert.equal(calls, 1)

      const result = observe(lifecycle[command]())
      await flush()
      assert.equal(calls, 2, 'the retirement retried the debt')
      if (retry === 'succeeds') {
        assert.equal(result.status, 'resolved')
        assert.deepEqual(lifecycle.state, command === 'stop'
          ? { kind: 'stopped', generation: 2 }
          : { kind: 'running', generation: 3 })
      } else {
        assert.equal(result.error, reason)
        const failed = failedState(lifecycle.state)
        assert.equal(failed.generation, 2)
        assert.equal(failed.phase, 'stop')
        assert.equal(failed.cleanupComplete, false)
        assert.equal(trace.kinds.includes('starting:3'), false, 'no replacement over debt (C-RET-06)')
      }
      const final = await shutdown(lifecycle)
      assert.equal(final.status, 'resolved')
      assert.equal(calls, retry === 'fails' ? 3 : 2)
      assert.equal(lifecycle.state.kind, 'stopped')
    })
  }
}

for (const rejects of [ false, true ]) {
  contract(`C-SCOPE-11.g-${rejects ? 'rejects' : 'succeeds'}`, `a run failure stays the reported error while a late release ${rejects ? 'fails' : 'succeeds'} (D31)`, {}, async ({ make }) => {
    const scopes: LifecycleScope[] = []
    const { lifecycle } = make({ onStart (scope) { scopes.push(scope) } })
    await lifecycle.start()
    await lifecycle.restart()
    const gate = Promise.withResolvers<void>()
    const primary = new Error('generation two failed')
    const secondary = new Error('old release failed')
    let calls = 0
    registerLate(scopes[0]!, () => (++calls === 1 ? gate.promise : undefined))
    scopes[1]!.fail(primary)
    await flush()
    const dirty = failedState(lifecycle.state)
    assert.equal(dirty.error, primary)
    assert.equal(dirty.cleanupComplete, false, 'the late release is still running')
    if (rejects) {
      gate.reject(secondary)
    } else {
      gate.resolve()
    }
    await flush()
    const state = failedState(lifecycle.state)
    assert.equal(state.generation, 2)
    assert.equal(state.phase, 'run')
    assert.equal(state.error, primary)
    assert.equal(state.cleanupComplete, !rejects)
    assert.equal(state.cleanupError, rejects ? secondary : undefined)
    await shutdown(lifecycle)
  })
}

for (const stopWins of [ false, true ]) {
  contract(`C-SCOPE-11.h-${stopWins ? 'stop' : 'start'}`, `with a late release pending, ${stopWins ? 'stop() waits for it before committing `stopped`' : 'start() on the running generation resolves at once'} (D31, C-CMD-04)`, {}, async ({ make }) => {
    // The Codex source test made start() wait for the late release; C-CMD-04
    // decides that start() on a running generation resolves at once.
    const scopes: LifecycleScope[] = []
    const { lifecycle } = make({ onStart (scope) { scopes.push(scope) } })
    await lifecycle.start()
    await lifecycle.restart()
    const gate = Promise.withResolvers<void>()
    registerLate(scopes[0]!, () => gate.promise)
    if (stopWins) {
      const stopped = observe(lifecycle.stop())
      await flush()
      assert.equal(stopped.status, 'pending', '`stopped` must mean everything was released (C-STATE-07)')
      gate.resolve()
      await flush()
      assert.equal(stopped.status, 'resolved')
      assert.deepEqual(lifecycle.state, { kind: 'stopped', generation: 2 })
    } else {
      const started = observe(lifecycle.start())
      await flush()
      assert.equal(started.status, 'resolved')
      assert.deepEqual(lifecycle.state, { kind: 'running', generation: 2 })
      gate.resolve()
      await flush()
      await shutdown(lifecycle)
    }
    assert.equal(scopes.length, 2)
  })
}

contract('C-SCOPE-11.i', 'a child running a late release reads `stopping`, so it can be claimed only after the release settles (D31, D33)', {}, async ({ make }) => {
  let retired: LifecycleScope | undefined
  const child = make({ onStart (scope) { retired = scope } }).lifecycle
  let owner: LifecycleScope | undefined
  const parent = make({ onStart (scope) { owner = scope } }).lifecycle
  await parent.start()
  await child.start()
  await child.stop()
  const gate = Promise.withResolvers<void>()
  registerLate(retired!, () => gate.promise)
  await flush()
  const refused = observe(owner!.start(child))
  await flush()
  assert.equal(errorName(refused.error), 'LifecycleUnsafeStateError')
  gate.resolve()
  await flush()
  const claimed = observe(owner!.start(child))
  await flush()
  assert.equal(claimed.status, 'resolved')
  await shutdown(parent)
  assert.equal(child.state.kind, 'stopped')
})

contract('C-SCOPE-11.j', 'two stop()s joining a late release share one deadline outcome (D31, C-RET-05)', { needs: [ 'clock' ] }, async ({ make }) => {
  const clock = new ManualClock()
  let retired: LifecycleScope | undefined
  const release = Promise.withResolvers<void>()
  const { lifecycle } = make({ onStart (scope) { retired = scope } }, { clock, stopTimeoutMs: 10 })
  await lifecycle.start()
  await lifecycle.stop()
  registerLate(retired!, () => release.promise)
  const first = observe(lifecycle.stop())
  const second = observe(lifecycle.stop())
  await clock.advance(10)
  assert.equal(errorName(first.error), 'LifecycleTimeoutError')
  assert.equal(second.error, first.error, 'the same outcome')
  release.resolve()
  await flush()
  await shutdown(lifecycle)
  assert.equal(lifecycle.state.kind, 'stopped')
})

contract('C-SCOPE-11.k', 'one stop deadline spans the live generation\'s onStop and the late releases it waits for (D31, C-TIME-03)', { needs: [ 'clock' ] }, async ({ make }) => {
  const clock = new ManualClock()
  let old: LifecycleScope | undefined
  let hooks = 0
  const { lifecycle } = make({
    onStart (scope) { old ??= scope },
    async onStop () {
      if (++hooks === 2) {
        await new Promise<void>(resolve => clock.setTimeout(resolve, 70))
        registerLate(old!, () => new Promise<void>(resolve => clock.setTimeout(resolve, 70)))
      }
    },
  }, { clock, stopTimeoutMs: 100 })
  await lifecycle.start()
  await lifecycle.restart()
  const stopped = observe(lifecycle.stop())
  await clock.advance(100)
  assert.equal(errorName(stopped.error), 'LifecycleTimeoutError', '70 ms of onStop and 70 ms of late release exceed one 100 ms deadline')
  assert.equal(failedState(lifecycle.state).cleanupComplete, false)
  await clock.advance(100)
  await shutdown(lifecycle)
})

contract('C-SCOPE-11.l', 'a late release that finished does not consume a later stop()\'s deadline (D31)', { needs: [ 'clock' ] }, async ({ make }) => {
  const clock = new ManualClock()
  let captured: LifecycleScope | undefined
  const { lifecycle } = make({ onStart (scope) { captured = scope } }, { clock, stopTimeoutMs: 30 })
  await lifecycle.start()
  await lifecycle.stop()
  registerLate(captured!, () => {})
  await flush()
  await lifecycle.restart()
  await clock.advance(50)
  const stopped = observe(lifecycle.stop())
  await flush()
  assert.equal(stopped.status, 'resolved', 'a fresh retirement gets its own budget')
  assert.deepEqual(lifecycle.state, { kind: 'stopped', generation: 2 })
})

for (const command of [ 'stop', 'restart' ] as const) {
  for (const outcome of [ 'release', 'fail', 'timeout' ] as const) {
    contract(`C-SCOPE-02.d-${command}-${outcome}`, `${command}() waits for a registration made during its own retirement, whose release ${outcome === 'release' ? 'succeeds' : outcome === 'fail' ? 'fails' : 'times out'} (C-SCOPE-02)`, { needs: outcome === 'timeout' ? [ 'clock' ] : [] }, async ({ make }) => {
      // Ported from the Codex suite ("stop / restart joins a late registration at
      // retirement completion"). The generation is still retiring, so this is not
      // a D31 late release: the registration is one of its own obligations.
      const clock = new ManualClock()
      const gate = Promise.withResolvers<void>()
      const reason = new Error('late release failed')
      let starts = 0
      let releases = 0
      const { lifecycle } = make({
        onStart (scope) {
          if (++starts > 1) {
            return
          }
          scope.defer(() => {
            registerLate(scope, () => (++releases === 1 ? gate.promise : undefined))
          })
        },
      }, { clock, stopTimeoutMs: outcome === 'timeout' ? 40 : undefined })
      await lifecycle.start()
      const result = observe(lifecycle[command]())
      await flush()
      try {
        if (outcome === 'timeout') {
          await clock.advance(40)
          assert.equal(errorName(result.error), 'LifecycleTimeoutError')
        } else {
          assert.equal(result.status, 'pending', 'the registration is joined')
          if (outcome === 'fail') {
            gate.reject(reason)
          } else {
            gate.resolve()
          }
          await flush()
          if (outcome === 'fail') {
            assert.equal(result.error, reason)
          } else {
            assert.equal(result.status, 'resolved')
          }
        }
        if (outcome === 'release') {
          assert.deepEqual(lifecycle.state, command === 'restart'
            ? { kind: 'running', generation: 2 }
            : { kind: 'stopped', generation: 1 })
        } else {
          assert.equal(failedState(lifecycle.state).cleanupComplete, false)
          assert.equal(starts, 1, 'no replacement over unfinished cleanup')
        }
      } finally {
        gate.resolve()
        await flush()
        await shutdown(lifecycle)
      }
      assert.equal(releases, outcome === 'fail' ? 2 : 1)
    })
  }
}

// ---------------------------------------------------------------------------
// Ported from the Copilot suite (src/async-lifecycle-copilot/async-lifecycle.test.ts)
// ---------------------------------------------------------------------------

contract('C-SCOPE-11.m', 'stop() then start() during an idle late release: stop() resolves when the release finishes, and the start runs the next generation (D31, C-CMD-08)', {}, async ({ make }) => {
  // The Copilot suite refused the start() while the late release ran;
  // C-SCOPE-11 queues it behind the release (C-CMD-06).
  let retired: LifecycleScope | undefined
  let starts = 0
  const gate = Promise.withResolvers<void>()
  const { lifecycle } = make({ onStart (scope) { starts++; retired ??= scope } })
  await lifecycle.start()
  await lifecycle.stop()
  registerLate(retired!, () => gate.promise)
  await flush()
  const stopped = observe(lifecycle.stop())
  const started = observe(lifecycle.start())
  await flush()
  assert.equal(stopped.status, 'pending')
  assert.equal(started.status, 'pending')
  assert.equal(starts, 1)
  gate.resolve()
  await flush()
  assert.equal(stopped.status, 'resolved')
  assert.equal(started.status, 'resolved')
  assert.deepEqual(lifecycle.state, { kind: 'running', generation: 2 })
  await shutdown(lifecycle)
})

// ---------------------------------------------------------------------------
// From review of #2999 (the final kernel's D31 implementation)
// ---------------------------------------------------------------------------

contract('C-SCOPE-11.n', 'a stop() accepted at any moment while a failed run waits for a late release resolves, and the instance ends `stopped` (D31)', {}, async ({ make }) => {
  // The window between the late release finishing and the engine publishing
  // its outcome is a few microtasks wide, so the delay is swept (C-TIME-05.d).
  for (let turns = 0; turns <= 40; turns++) {
    const scopes: LifecycleScope[] = []
    const gate = Promise.withResolvers<void>()
    const failure = new Error('lost connection')
    const { lifecycle } = make({ onStart (scope) { scopes.push(scope) } })
    await lifecycle.start()
    await lifecycle.restart()
    registerLate(scopes[0]!, () => gate.promise)
    scopes[1]!.fail(failure)
    await flush()
    gate.resolve()
    await flush(turns)
    const stopped = observe(lifecycle.stop())
    await flush()
    await flush()
    assert.equal(stopped.status, 'resolved', `turn ${turns}: the stop() must settle`)
    assert.equal(lifecycle.state.kind, 'stopped', `turn ${turns}`)
  }
})

contract('C-SCOPE-11.o', 'a stop() retries the debt that existed when it was accepted, and only reports a late release that fails while it waits (D31, C-CMD-10)', {}, async ({ make }) => {
  const first = new Error('older debt')
  const second = new Error('fails while the stop() waits')
  const gate = Promise.withResolvers<void>()
  let retired: LifecycleScope | undefined
  let a = 0
  let b = 0
  const { lifecycle } = make({ onStart (scope) { retired = scope } })
  await lifecycle.start()
  await lifecycle.stop()
  registerLate(retired!, () => { if (++a === 1) { throw first } })
  registerLate(retired!, () => (++b === 1 ? gate.promise : undefined))
  await flush()
  const stopped = observe(lifecycle.stop())
  await flush()
  gate.reject(second)
  await flush()
  assert.equal(stopped.error, second, 'the new failure is reported')
  assert.equal(a, 2, 'the older debt was retried')
  assert.equal(b, 1, 'the new failure is not retried in the same pass')
  assert.equal(failedState(lifecycle.state).cleanupComplete, false)
  const again = observe(lifecycle.stop())
  await flush()
  assert.equal(again.status, 'resolved')
  assert.equal(b, 2)
  assert.equal(lifecycle.state.kind, 'stopped')
})

contract('C-SCOPE-11.p', 'a release registered on a failed run while it waits for a late release keeps it dirty until that release finishes too (D31)', {}, async ({ make }) => {
  const scopes: LifecycleScope[] = []
  const older = Promise.withResolvers<void>()
  const own = Promise.withResolvers<void>()
  const failure = new Error('lost connection')
  const { lifecycle } = make({ onStart (scope) { scopes.push(scope) } })
  await lifecycle.start()
  await lifecycle.restart()
  registerLate(scopes[0]!, () => older.promise)
  scopes[1]!.fail(failure)
  await flush()
  registerLate(scopes[1]!, () => own.promise, failure)
  older.resolve()
  await flush()
  assert.equal(failedState(lifecycle.state).cleanupComplete, false, 'its own release is still running')
  const refused = observe(lifecycle.start())
  await flush()
  assert.equal(errorName(refused.error), 'LifecycleUnsafeStateError', 'no new run over an unreleased resource')
  own.resolve()
  await flush()
  const state = failedState(lifecycle.state)
  assert.equal(state.error, failure)
  assert.equal(state.cleanupComplete, true)
  await shutdown(lifecycle)
})

contract('C-SCOPE-11.q', 'a stop() that a late release calls from inside its own cleanup waits for that release (D31)', {}, async ({ make }) => {
  let retired: LifecycleScope | undefined
  let inner: ReturnType<typeof observe<void>> | undefined
  const gate = Promise.withResolvers<void>()
  const { lifecycle } = make({ onStart (scope) { retired = scope } })
  await lifecycle.start()
  await lifecycle.stop()
  registerLate(retired!, () => {
    inner = observe(lifecycle.stop())
    return gate.promise
  })
  await flush()
  assert.equal(inner?.status, 'pending', 'the release it is part of is still running')
  gate.resolve()
  await flush()
  assert.equal(inner?.status, 'resolved')
  assert.equal(lifecycle.state.kind, 'stopped')
})

contract('C-SCOPE-11.r', 'a late release that rejects while a failure retires a run is reported as that run\'s cleanup error (D31)', {}, async ({ make }) => {
  const scopes: LifecycleScope[] = []
  const stopGate = Promise.withResolvers<void>()
  const late = Promise.withResolvers<void>()
  const failure = new Error('lost connection')
  const secondary = new Error('older release failed')
  const { lifecycle } = make({
    onStart (scope) { scopes.push(scope) },
    onStop: stop => (stop.generation === 2 ? stopGate.promise : undefined),
  })
  await lifecycle.start()
  await lifecycle.restart()
  registerLate(scopes[0]!, () => late.promise)
  scopes[1]!.fail(failure)
  await flush()
  late.reject(secondary)
  await flush()
  stopGate.resolve()
  await flush()
  const state = failedState(lifecycle.state)
  assert.equal(state.error, failure)
  assert.equal(state.cleanupComplete, false)
  assert.equal(state.cleanupError, secondary, 'the actual rejection, not "still in progress"')
  await shutdown(lifecycle)
})

for (const rejects of [ false, true ]) {
  contract(`C-SCOPE-11.s-${rejects ? 'rejects' : 'succeeds'}`, `an onStop error of a failed run waiting for a late release is kept when that release ${rejects ? 'fails' : 'succeeds'} (D31, C-RET-04)`, {}, async ({ make }) => {
    const scopes: LifecycleScope[] = []
    const late = Promise.withResolvers<void>()
    const failure = new Error('lost connection')
    const stopError = new Error('onStop failed')
    const secondary = new Error('older release failed')
    const { lifecycle } = make({
      onStart (scope) { scopes.push(scope) },
      onStop (stop) {
        if (stop.generation === 2) {
          throw stopError
        }
      },
    })
    await lifecycle.start()
    await lifecycle.restart()
    registerLate(scopes[0]!, () => late.promise)
    scopes[1]!.fail(failure)
    await flush()
    if (rejects) {
      late.reject(secondary)
    } else {
      late.resolve()
    }
    await flush()
    const state = failedState(lifecycle.state)
    assert.equal(state.error, failure)
    assert.equal(state.cleanupComplete, !rejects)
    if (rejects) {
      assert.ok(state.cleanupError instanceof AggregateError)
      assert.deepEqual(state.cleanupError.errors, [ stopError, secondary ])
    } else {
      assert.equal(state.cleanupError, stopError)
    }
    await shutdown(lifecycle)
  })
}

// ---------------------------------------------------------------------------
// From the second review of #2999
// ---------------------------------------------------------------------------

contract('C-SCOPE-11.t', 'stop() waits for a release registered on the retiring run\'s own scope while it waits for an older late release (D31, C-SCOPE-02)', {}, async ({ make }) => {
  const scopes: LifecycleScope[] = []
  const older = Promise.withResolvers<void>()
  const own = Promise.withResolvers<void>()
  const { lifecycle } = make({ onStart (scope) { scopes.push(scope) } })
  await lifecycle.start()
  await lifecycle.restart()
  registerLate(scopes[0]!, () => older.promise)
  const stopped = observe(lifecycle.stop())
  await flush()
  registerLate(scopes[1]!, () => own.promise)
  older.resolve()
  await flush()
  assert.equal(stopped.status, 'pending', 'its own release is still running')
  own.resolve()
  await flush()
  assert.equal(stopped.status, 'resolved')
  assert.equal(lifecycle.state.kind, 'stopped')
})

contract('C-SCOPE-11.u', 'a starting run fails with a late release\'s error as soon as it fails, while another late release still runs (D31)', {}, async ({ make }) => {
  const reason = new Error('older release failed')
  const failing = Promise.withResolvers<void>()
  const pending = Promise.withResolvers<void>()
  let old: LifecycleScope | undefined
  const { lifecycle } = make({
    onStart (scope) {
      if (!old) {
        old = scope
        return
      }
      registerLate(old, () => failing.promise)
      registerLate(old, () => pending.promise)
    },
  })
  await lifecycle.start()
  const started = observe(lifecycle.restart())
  await flush()
  failing.reject(reason)
  await flush()
  assert.equal(started.error, reason, 'it does not wait for the other late release')
  pending.resolve()
  await flush()
  await shutdown(lifecycle)
})

contract('C-SCOPE-11.v', 'a late release registered at any moment while a run is starting keeps it from committing `running` until it finishes (D31)', {}, async ({ make }) => {
  // A drain that just finished must not let a release registered in the next
  // microtasks slip through, so the moment of the second release is swept.
  for (let turns = 0; turns <= 30; turns++) {
    const first = Promise.withResolvers<void>()
    const second = Promise.withResolvers<void>()
    let old: LifecycleScope | undefined
    const { lifecycle } = make({
      onStart (scope) {
        if (!old) {
          old = scope
          return
        }
        registerLate(old, () => first.promise)
      },
    })
    await lifecycle.start()
    const started = observe(lifecycle.restart())
    await flush()
    first.resolve()
    await flush(turns)
    const startingAtRegistration = lifecycle.state.kind === 'starting'
    registerLate(old!, () => second.promise)
    await flush()
    if (startingAtRegistration) {
      assert.notEqual(lifecycle.state.kind, 'running', `turn ${turns}: running committed while a late release runs`)
    }
    second.resolve()
    await flush()
    assert.equal(started.status, 'resolved', `turn ${turns}`)
    await shutdown(lifecycle)
  }
})

contract('C-SCOPE-11.w', 'a late release that fails while a failure\'s retirement is retrying older debt is reported, not "still in progress" (D31)', {}, async ({ make }) => {
  const scopes: LifecycleScope[] = []
  const retrying = Promise.withResolvers<void>()
  const late = Promise.withResolvers<void>()
  const failure = new Error('lost connection')
  const lateError = new Error('fails during the retry')
  let attempts = 0
  const { lifecycle } = make({ onStart (scope) { scopes.push(scope) } })
  await lifecycle.start()
  await lifecycle.restart()
  registerLate(scopes[0]!, () => {
    if (++attempts === 1) {
      throw new Error('older debt')
    }
    return retrying.promise // the retry blocks
  })
  registerLate(scopes[0]!, () => late.promise)
  await flush()
  scopes[1]!.fail(failure)
  await flush()
  assert.equal(attempts, 2, 'the retirement is retrying the older debt')
  late.reject(lateError)
  await flush()
  retrying.resolve()
  await flush()
  const state = failedState(lifecycle.state)
  assert.equal(state.error, failure)
  assert.equal(state.cleanupComplete, false)
  assert.equal(state.cleanupError, lateError)
  await shutdown(lifecycle)
})

contract('C-SCOPE-11.x', 'a stop() waits for a late release that one of its debt retries registers (D31)', {}, async ({ make }) => {
  const scopes: LifecycleScope[] = []
  const gate = Promise.withResolvers<void>()
  let attempts = 0
  const { lifecycle } = make({ onStart (scope) { scopes.push(scope) } })
  await lifecycle.start()
  await lifecycle.restart()
  await lifecycle.stop()
  registerLate(scopes[0]!, () => {
    if (++attempts === 1) {
      throw new Error('older debt')
    }
    registerLate(scopes[1]!, () => gate.promise) // the retry registers another
  })
  await flush()
  assert.equal(failedState(lifecycle.state).cleanupComplete, false)
  const stopped = observe(lifecycle.stop())
  await flush()
  assert.equal(attempts, 2)
  assert.equal(stopped.status, 'pending', 'the release the retry registered is still running')
  gate.resolve()
  await flush()
  assert.equal(stopped.status, 'resolved')
  assert.equal(lifecycle.state.kind, 'stopped')
})

contract('C-SCOPE-11.y', 'a late release that fails during a failure\'s retirement is reported once when the outcome is published (D31, C-RET-04)', {}, async ({ make }) => {
  const scopes: LifecycleScope[] = []
  const stopGate = Promise.withResolvers<void>()
  const failing = Promise.withResolvers<void>()
  const pending = Promise.withResolvers<void>()
  const failure = new Error('lost connection')
  const lateError = new Error('older release failed')
  const { lifecycle } = make({
    onStart (scope) { scopes.push(scope) },
    onStop: stop => (stop.generation === 2 ? stopGate.promise : undefined),
  })
  await lifecycle.start()
  await lifecycle.restart()
  registerLate(scopes[0]!, () => failing.promise)
  registerLate(scopes[0]!, () => pending.promise)
  scopes[1]!.fail(failure)
  await flush()
  failing.reject(lateError)
  await flush()
  stopGate.resolve()
  await flush()
  assert.equal(failedState(lifecycle.state).cleanupError, lateError)
  pending.resolve()
  await flush()
  const state = failedState(lifecycle.state)
  assert.equal(state.cleanupComplete, false)
  assert.equal(state.cleanupError, lateError, 'once, not AggregateError([e, e])')
  await shutdown(lifecycle)
})

// ---------------------------------------------------------------------------
// From the third review of #2999
// ---------------------------------------------------------------------------

for (const where of [ 'idle', 'live' ] as const) {
  contract(`C-SCOPE-11.z-${where}`, `a late release registered at any moment while a stop() of ${where === 'idle' ? 'an idle instance' : 'a running instance'} waits for an older one is joined, not reported as "still in progress" (D31)`, {}, async ({ make }) => {
    // The window between the last drain and the published outcome is a few
    // microtasks wide, so the registration is swept (C-TIME-05.d).
    for (let turns = 0; turns <= 30; turns++) {
      const scopes: LifecycleScope[] = []
      const first = Promise.withResolvers<void>()
      const second = Promise.withResolvers<void>()
      const { lifecycle } = make({ onStart (scope) { scopes.push(scope) } })
      await lifecycle.start()
      if (where === 'idle') {
        await lifecycle.stop()
      } else {
        await lifecycle.restart()
      }
      registerLate(scopes[0]!, () => first.promise)
      await flush()
      const stopped = observe(lifecycle.stop())
      await flush()
      first.resolve()
      await flush(turns)
      registerLate(scopes[0]!, () => second.promise)
      await flush()
      assert.notEqual(stopped.status, 'rejected', `turn ${turns}: ${String(stopped.error)}`)
      second.resolve()
      await flush()
      assert.equal(stopped.status, 'resolved', `turn ${turns}`)
      assert.equal(lifecycle.state.kind, 'stopped', `turn ${turns}`)
    }
  })
}

contract('C-SCOPE-11.za', 'a release on the retiring run\'s own scope that fails while the stop() waits for an older late release is reported as itself (D31)', {}, async ({ make }) => {
  const scopes: LifecycleScope[] = []
  const older = Promise.withResolvers<void>()
  const own = Promise.withResolvers<void>()
  const ownError = new Error('own release failed')
  const { lifecycle } = make({ onStart (scope) { scopes.push(scope) } })
  await lifecycle.start()
  await lifecycle.restart()
  registerLate(scopes[0]!, () => older.promise)
  const stopped = observe(lifecycle.stop())
  await flush()
  registerLate(scopes[1]!, () => own.promise)
  own.reject(ownError)
  await flush()
  older.resolve()
  await flush()
  assert.equal(stopped.error, ownError, 'the actual failure, not "a release is still in progress"')
  const state = failedState(lifecycle.state)
  assert.equal(state.cleanupComplete, false)
  assert.equal(state.cleanupError, ownError)
  await shutdown(lifecycle)
})

contract('C-SCOPE-11.zb', 'on an idle instance, a late release that fails while another still runs is published as debt at once, and a queued start() gets its error (D31)', {}, async ({ make }) => {
  const reason = new Error('late release failed')
  const failing = Promise.withResolvers<void>()
  const pending = Promise.withResolvers<void>()
  let retired: LifecycleScope | undefined
  const { lifecycle } = make({ onStart (scope) { retired ??= scope } })
  await lifecycle.start()
  await lifecycle.stop()
  registerLate(retired!, () => failing.promise)
  registerLate(retired!, () => pending.promise)
  const started = observe(lifecycle.start())
  await flush()
  failing.reject(reason)
  await flush()
  const state = failedState(lifecycle.state)
  assert.equal(state.cleanupComplete, false)
  assert.equal(state.cleanupError, reason)
  assert.equal(started.error, reason, 'the queued start() is not left waiting')
  pending.resolve()
  await flush()
  await shutdown(lifecycle)
})
