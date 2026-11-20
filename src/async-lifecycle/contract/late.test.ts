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

import type { LifecycleScope } from '../types.ts'
import { errorName, failedState, flush, ManualClock, observe, shutdown, stateTrace } from './harness.ts'
import { contract } from './suite.ts'

/** Register `cleanup` on a retired scope, asserting the late registration throws. */
function registerLate (scope: LifecycleScope, cleanup: () => unknown): void {
  assert.throws(() => scope.defer(cleanup), (error: unknown) => errorName(error) === 'LifecycleSupersededError')
}

contract('C-SCOPE-11.a', 'on an idle instance the state is `stopping` while a late release runs, then `stopped` (D31)', {}, async ({ make }) => {
  const trace = stateTrace()
  let retired: LifecycleScope | undefined
  const gate = Promise.withResolvers<void>()
  const { lifecycle } = make({ onStart (scope) { retired = scope }, onStateChange: trace.onStateChange })
  await lifecycle.start()
  await lifecycle.stop()
  registerLate(retired!, () => gate.promise)
  await flush()
  assert.equal(lifecycle.state.kind, 'stopping', '`stopped` would claim everything was released (C-STATE-07)')
  gate.resolve()
  await flush()
  assert.equal(lifecycle.state.kind, 'stopped')
  assert.deepEqual(trace.kinds.slice(-2), [ 'stopping:1', 'stopped:1' ])
})

contract('C-SCOPE-11.b', 'a late release that fails on an idle instance leaves failed { stop, cleanupComplete: false } until stop() retries it (D31)', {}, async ({ make }) => {
  const reason = new Error('late release failed')
  let retired: LifecycleScope | undefined
  let calls = 0
  const { lifecycle } = make({ onStart (scope) { retired = scope } })
  await lifecycle.start()
  await lifecycle.stop()
  registerLate(retired!, () => { if (++calls === 1) { throw reason } })
  await flush()
  const failed = failedState(lifecycle.state)
  assert.equal(failed.phase, 'stop')
  assert.equal(failed.cleanupComplete, false)
  assert.equal(failed.cleanupError, reason)
  const final = await shutdown(lifecycle)
  assert.equal(final.status, 'resolved')
  assert.equal(calls, 2)
  assert.equal(lifecycle.state.kind, 'stopped')
})

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

contract('C-SCOPE-11.f', 'a late release that fails while a generation is running fails that generation, leaving cleanup debt (D31)', {}, async ({ make }) => {
  // The Claude source test expected the running generation to continue; D31
  // decides that the failure retires it and leaves failed { cleanupComplete: false }.
  const reason = new Error('late')
  let first: LifecycleScope | undefined
  let calls = 0
  const { lifecycle } = make({ onStart (scope) { first ??= scope } })
  await lifecycle.start()
  await lifecycle.stop()
  await lifecycle.start()
  registerLate(first!, () => { if (++calls === 1) { throw reason } })
  await flush()
  const failed = failedState(lifecycle.state)
  assert.equal(failed.generation, 2)
  assert.equal(failed.error, reason)
  assert.equal(failed.cleanupComplete, false)
  const final = await shutdown(lifecycle)
  assert.equal(final.status, 'resolved')
  assert.equal(calls, 2)
  assert.equal(lifecycle.state.kind, 'stopped')
})

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
