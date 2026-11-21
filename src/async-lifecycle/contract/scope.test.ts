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
 * Contract tests for the per-generation scope (README §6, C-SCOPE-*).
 */

import assert from 'node:assert/strict'

import type { LifecycleScope } from '../types.ts'
import { EventEmitter } from 'node:events'

import { errorName, failedState, flush, ManualClock, observe, type Observed, shutdown } from './harness.ts'
import { contract } from './suite.ts'

contract('C-SCOPE-02.a', 'a retired scope ignores fail() and set(), so the state does not change', {}, async ({ make }) => {
  let captured: LifecycleScope | undefined
  const subject = make({ onStart (scope) { captured = scope } })
  const { lifecycle } = subject
  await lifecycle.start()
  await lifecycle.stop()
  const snapshot = lifecycle.state

  captured!.fail(new Error('late failure'))
  captured!.set(subject.condition('ready'))
  await flush()
  assert.equal(lifecycle.state, snapshot, 'the same frozen snapshot: nothing was committed')
})

contract('C-SCOPE-02.b', 'the scope is sealed before an abort listener runs: defer() releases at once and throws', {}, async ({ make }) => {
  const entered = Promise.withResolvers<void>()
  let calls = 0
  let thrown: unknown
  let callsWhenThrown: number | undefined
  const { lifecycle } = make({
    async onStart (scope) {
      scope.signal.addEventListener('abort', () => {
        try {
          scope.defer(() => { calls++ })
        } catch (error) {
          thrown = error
          callsWhenThrown = calls
        }
      }, { once: true })
      entered.resolve()
      await new Promise<void>(resolve => scope.signal.addEventListener('abort', () => resolve(), { once: true }))
    },
  })
  const started = observe(lifecycle.start())
  await entered.promise
  const stopped = observe(lifecycle.stop())
  await flush()
  assert.equal(errorName(started.error), 'LifecycleSupersededError')
  assert.equal(stopped.status, 'resolved')
  assert.equal(errorName(thrown), 'LifecycleSupersededError', 'a late registration throws the retirement reason')
  assert.equal(callsWhenThrown, 1, 'the late cleanup ran before defer() threw')
  assert.equal(calls, 1)
})

contract('C-SCOPE-08.a', 'two late registrations of the same function are two obligations, each retried until it succeeds', {}, async ({ make }) => {
  let retired: LifecycleScope | undefined
  const { lifecycle } = make({ onStart (scope) { retired = scope } })
  await lifecycle.start()
  await lifecycle.stop()

  let calls = 0
  const release = () => {
    if (++calls <= 2) {
      throw new Error('retry release')
    }
  }
  assert.throws(() => retired!.defer(release), (error: unknown) => errorName(error) === 'LifecycleSupersededError')
  assert.throws(() => retired!.defer(release), (error: unknown) => errorName(error) === 'LifecycleSupersededError')
  await flush()
  assert.equal(lifecycle.state.kind, 'failed', 'a failed release on a retired scope is cleanup debt')
  assert.equal(lifecycle.state.kind === 'failed' && lifecycle.state.cleanupComplete, false)

  const stopped = observe(lifecycle.stop())
  await flush()
  assert.equal(stopped.status, 'resolved')
  assert.equal(calls, 4, 'each obligation ran once, failed once, and was retried once')
  assert.equal(lifecycle.state.kind, 'stopped')
})

contract('C-SCOPE-09.a', 'a failed late release on a retired scope blocks start() until stop() retries it', {}, async ({ make }) => {
  const reason = new Error('late release')
  let remembered: LifecycleScope | undefined
  let tries = 0
  const { lifecycle } = make({ onStart (scope) { remembered = scope } })
  await lifecycle.start()
  await lifecycle.stop()
  assert.throws(() => remembered!.defer(() => {
    if (++tries === 1) {
      throw reason
    }
  }), (error: unknown) => errorName(error) === 'LifecycleSupersededError')
  await flush()

  const failed = lifecycle.state
  assert.ok(failed.kind === 'failed')
  assert.equal(failed.cleanupComplete, false)
  assert.equal(failed.cleanupError, reason)

  const refused = observe(lifecycle.start())
  await flush()
  assert.equal(errorName(refused.error), 'LifecycleUnsafeStateError')

  const stopped = observe(lifecycle.stop())
  await flush()
  assert.equal(stopped.status, 'resolved')
  assert.equal(tries, 2)

  const restarted = observe(lifecycle.start())
  await flush()
  assert.equal(restarted.status, 'resolved')
  await shutdown(lifecycle)
})

contract('C-SCOPE-07.a', 'a spawned task that rejects while starting fails the attempt with its value, phase `start`', {}, async ({ make }) => {
  // Codex source test expected phase `run`; C-STATE-05 says `start` before running.
  let starts = 0
  const { lifecycle } = make({
    async onStart (scope) {
      starts++
      scope.spawn(async () => { throw undefined }) // falsy failures must survive as themselves
      await new Promise<void>(resolve => scope.signal.addEventListener('abort', () => resolve(), { once: true }))
    },
  })
  const started = observe(lifecycle.start())
  await flush()
  assert.equal(started.status, 'rejected')
  assert.equal(started.error, undefined)
  assert.equal(starts, 1, 'a failed attempt is not retried')
  assert.ok(lifecycle.state.kind === 'failed')
  assert.equal(lifecycle.state.phase, 'start')
  assert.equal(lifecycle.state.error, undefined)
  await shutdown(lifecycle)
})

// ---------------------------------------------------------------------------
// Ported from the Claude suite (src/async-lifecycle-claude/engine.test.ts)
// ---------------------------------------------------------------------------

contract('C-SCOPE-02.c', 'a sealed scope releases a late defer() at once and refuses acquire, spawn and start without running them', { needs: [ 'scope.acquire' ] }, async ({ make }) => {
  const log: string[] = []
  let saved: LifecycleScope | undefined
  const child = make({ onStart () { log.push('child started') } }).lifecycle
  const { lifecycle } = make({
    onStart (scope) { saved = scope },
    async onStop () {
      try {
        saved!.defer(() => { log.push('late released') })
      } catch (error) {
        log.push(`defer threw ${errorName(error)}`)
      }
      await saved!.acquire(() => { log.push('created') }, () => {}).catch(() => log.push('acquire refused'))
      try {
        saved!.spawn(async () => { log.push('task ran') })
      } catch {
        log.push('spawn refused')
      }
      await saved!.start(child).catch(() => log.push('child refused'))
    },
  })
  await lifecycle.start()
  // onStop runs after the seal (C-RET-01 steps 1 and 2).
  await lifecycle.stop()
  assert.deepEqual(log, [
    'late released', 'defer threw LifecycleSupersededError',
    'acquire refused', 'spawn refused', 'child refused',
  ])
  assert.equal(child.state.kind, 'stopped')
})

contract('C-SCOPE-03.a', 'listeners never accumulate across start/stop cycles (#2905 F)', {}, async ({ make }) => {
  const puppet = new EventEmitter()
  const { lifecycle } = make({
    onStart (scope) {
      for (const event of [ 'ready', 'logout' ]) {
        const listener = () => {}
        puppet.on(event, listener)
        scope.defer(() => puppet.off(event, listener))
      }
    },
  })
  for (let i = 0; i < 3; i++) {
    await lifecycle.start()
    assert.equal(puppet.listenerCount('ready'), 1)
    assert.equal(puppet.listenerCount('logout'), 1)
    await lifecycle.stop()
    assert.equal(puppet.listenerCount('ready'), 0)
    assert.equal(puppet.listenerCount('logout'), 0)
  }
})

contract('C-SCOPE-04.a', 'acquire() passes scope.signal to create and releases the resource at retirement', { needs: [ 'scope.acquire' ] }, async ({ make }) => {
  const log: string[] = []
  const { lifecycle } = make({
    async onStart (scope) {
      const resource = await scope.acquire(
        signal => { log.push(`create same-signal=${signal === scope.signal}`); return 'r' },
        r => { log.push(`release ${r}`) },
      )
      log.push(`got ${resource}`)
    },
  })
  await lifecycle.start()
  await lifecycle.stop()
  assert.deepEqual(log, [ 'create same-signal=true', 'got r', 'release r' ])
})

contract('C-SCOPE-04.b', 'an acquisition that resolves after retirement began is released, and acquire() rejects with the retirement reason', { needs: [ 'scope.acquire' ] }, async ({ make }) => {
  const log: string[] = []
  const gate = Promise.withResolvers<string>()
  const { lifecycle } = make({
    async onStart (scope) {
      try {
        await scope.acquire(() => gate.promise, r => { log.push(`release ${r}`) })
      } catch (error) {
        log.push(`rejected ${errorName(error)}`)
        throw error
      }
    },
  })
  const started = observe(lifecycle.start())
  await flush()
  const stopped = observe(lifecycle.stop())
  await flush()
  gate.resolve('late')
  await flush()
  assert.equal(stopped.status, 'resolved')
  assert.equal(errorName(started.error), 'LifecycleSupersededError')
  // C-SCOPE-04 requires both, not an order (the Claude source test fixed one).
  assert.deepEqual([ ...log ].sort(), [ 'rejected LifecycleSupersededError', 'release late' ])
})

contract('C-SCOPE-04.c', 'a create() that throws releases nothing and fails the attempt cleanly', { needs: [ 'scope.acquire' ] }, async ({ make }) => {
  let released = 0
  const { lifecycle } = make({
    onStart: scope => scope.acquire(() => { throw new Error('create') }, () => { released++ }).then(() => {}),
  })
  const started = observe(lifecycle.start())
  await flush()
  assert.match(String((started.error as Error).message), /create/)
  assert.equal(released, 0)
  assert.equal(failedState(lifecycle.state).cleanupComplete, true)
})

contract('C-SCOPE-05.a', 'an interrupt unblocks a task that ignores abort, before the task is joined', { needs: [ 'scope.acquire', 'acquire.interrupt' ] }, async ({ make }) => {
  const log: string[] = []
  const { lifecycle } = make({
    async onStart (scope) {
      const socket = await scope.acquire(
        () => new EventTarget(),
        () => { log.push('close') },
        { interrupt: s => s.dispatchEvent(new Event('end')) },
      )
      // This task ignores the abort signal: only the socket ending stops it.
      scope.spawn(() => new Promise<void>(resolve => {
        socket.addEventListener('end', () => { log.push('task ends'); resolve() })
      }))
    },
  })
  await lifecycle.start()
  const stopped = observe(lifecycle.stop())
  await flush()
  assert.equal(stopped.status, 'resolved')
  assert.deepEqual(log, [ 'task ends', 'close' ])
})

contract('C-SCOPE-05.b', 'an acquisition that finishes after the interrupt pass is interrupted before it is released', { needs: [ 'scope.acquire', 'acquire.interrupt' ] }, async ({ make }) => {
  const log: string[] = []
  const creating = Promise.withResolvers<EventTarget>()
  const { lifecycle } = make({
    onStart (scope) {
      const socket = scope.acquire(
        () => creating.promise,
        () => { log.push('close') },
        { interrupt: s => { log.push('interrupt'); s.dispatchEvent(new Event('end')) } },
      )
      socket.catch(() => {})
      scope.spawn(async () => {
        const s = await socket.catch(() => undefined)
        if (s) {
          await new Promise<void>(resolve => s.addEventListener('end', () => resolve()))
        }
      })
    },
  })
  await lifecycle.start()
  const stopped = observe(lifecycle.stop())
  await flush()
  assert.deepEqual(log, [], 'the interrupt pass ran before the resource existed')
  creating.resolve(new EventTarget())
  await flush()
  assert.equal(stopped.status, 'resolved')
  assert.deepEqual(log, [ 'interrupt', 'close' ])
})

contract('C-SCOPE-05.c', 'a late interrupt that throws is a cleanup error, and the resource is still released', { needs: [ 'scope.acquire', 'acquire.interrupt' ] }, async ({ make }) => {
  const creating = Promise.withResolvers<string>()
  const boom = new Error('interrupt')
  const { lifecycle } = make({
    onStart (scope) {
      void scope.acquire(() => creating.promise, () => {}, { interrupt: () => { throw boom } }).catch(() => {})
    },
  })
  await lifecycle.start()
  const stopped = observe(lifecycle.stop())
  await flush()
  creating.resolve('r')
  await flush()
  assert.equal(stopped.error, boom)
  assert.equal(failedState(lifecycle.state).cleanupComplete, true)
})

contract('C-SCOPE-06.a', 'use() accepts AsyncDisposable and Disposable, releases them newest first, and refuses anything else', {}, async ({ make }) => {
  const log: string[] = []
  let refused: unknown
  const { lifecycle } = make({
    onStart (scope) {
      scope.use({ [Symbol.asyncDispose]: async () => { log.push('async') } })
      scope.use({ [Symbol.dispose]: () => { log.push('sync') } })
      try {
        scope.use({} as Disposable)
      } catch (error) {
        refused = error
      }
    },
  })
  await lifecycle.start()
  await lifecycle.stop()
  assert.ok(refused instanceof TypeError)
  assert.deepEqual(log, [ 'sync', 'async' ])
})

contract('C-SCOPE-07.b', 'a spawned task gets scope.signal, which aborts at retirement, and it is joined', {}, async ({ make }) => {
  const log: string[] = []
  const { lifecycle } = make({
    onStart: scope => scope.spawn(async signal => {
      log.push(`same=${signal === scope.signal}`)
      await new Promise(resolve => signal.addEventListener('abort', resolve))
      await flush(3)
      log.push('joined')
    }),
  })
  await lifecycle.start()
  const stopped = observe(lifecycle.stop())
  await flush()
  assert.equal(stopped.status, 'resolved')
  assert.deepEqual(log, [ 'same=true', 'joined' ])
})

for (const crash of [ new Error('crash'), undefined ]) {
  contract(`C-SCOPE-07.c-${crash === undefined ? 'undefined' : 'error'}`, `a spawned task that rejects with ${crash === undefined ? 'undefined' : 'an error'} while running fails the generation, phase \`run\`, cleanly`, {}, async ({ make }) => {
    // Falsy rejection values are failures too (C-STATE-05); the Claude source covered undefined.
    const gate = Promise.withResolvers<void>()
    const { lifecycle } = make({ onStart: scope => scope.spawn(async () => { await gate.promise; throw crash }) })
    await lifecycle.start()
    gate.resolve()
    await flush()
    const failed = failedState(lifecycle.state)
    assert.equal(failed.phase, 'run')
    assert.equal(failed.error, crash)
    assert.equal(failed.cleanupComplete, true)
  })
}

contract('C-SCOPE-07.d', 'a task that fails while retiring is reported once as a cleanup error, and start() works after', {}, async ({ make }) => {
  const late = new Error('late task')
  const { lifecycle } = make({
    onStart: scope => scope.spawn(async signal => {
      await new Promise(resolve => signal.addEventListener('abort', resolve))
      throw late
    }),
  })
  await lifecycle.start()
  const stopped = observe(lifecycle.stop())
  await flush()
  assert.equal(stopped.error, late)
  assert.equal(failedState(lifecycle.state).cleanupComplete, true)
  const restarted = observe(lifecycle.start())
  await flush()
  assert.equal(restarted.status, 'resolved')
  await shutdown(lifecycle)
})

contract('C-SCOPE-09.b', 'a stop() that times out on a late release settles, and the next stop() completes once the release clears', { needs: [ 'clock' ] }, async ({ make }) => {
  const clock = new ManualClock()
  let saved: LifecycleScope | undefined
  const gate = Promise.withResolvers<void>()
  let calls = 0
  const { lifecycle } = make({ onStart (scope) { saved = scope } }, { stopTimeoutMs: 50, clock })
  await lifecycle.start()
  await lifecycle.stop()
  assert.throws(() => saved!.defer(() => {
    if (++calls === 1) {
      throw new Error('late')
    }
    return gate.promise
  }), (error: unknown) => errorName(error) === 'LifecycleSupersededError')
  await flush()
  const retry = observe(lifecycle.stop())
  await clock.advance(60)
  assert.equal(errorName(retry.error), 'LifecycleTimeoutError')
  gate.resolve()
  await flush()
  const final = await shutdown(lifecycle)
  assert.equal(final.status, 'resolved')
  assert.equal(lifecycle.state.kind, 'stopped')
})

contract('C-SCOPE-09.c', 'a late release that fails in joined work is retried by the joining stop(), which still reports the failure (D36)', { needs: [ 'clock' ] }, async ({ make }) => {
  const clock = new ManualClock()
  let saved: LifecycleScope | undefined
  let calls = 0
  const pending = Promise.withResolvers<void>()
  const late = new Error('late')
  const { lifecycle } = make({ onStart (scope) { saved = scope } }, { stopTimeoutMs: 50, clock })
  await lifecycle.start()
  await lifecycle.stop()
  assert.throws(() => saved!.defer(() => {
    calls++
    if (calls === 1) {
      throw new Error('first')
    }
    if (calls === 2) {
      return pending.promise
    }
    return undefined
  }), (error: unknown) => errorName(error) === 'LifecycleSupersededError')
  await flush()
  const timedOut = observe(lifecycle.stop())
  await clock.advance(60)
  assert.equal(errorName(timedOut.error), 'LifecycleTimeoutError')

  const retry = observe(lifecycle.stop())
  pending.reject(late)
  await clock.advance(1)
  assert.equal(retry.error, late, 'the joined failure is reported')
  assert.equal(calls, 3, 'and retried once by the same stop()')
  const failed = failedState(lifecycle.state)
  assert.equal(failed.cleanupComplete, true)
  assert.equal(failed.cleanupError, late)

  const final = await shutdown(lifecycle)
  assert.equal(final.status, 'resolved')
  assert.equal(lifecycle.state.kind, 'stopped')
})

// ---------------------------------------------------------------------------
// Ported from the Copilot suite (src/async-lifecycle-copilot/async-lifecycle.test.ts)
// ---------------------------------------------------------------------------

for (const from of [ 'release', 'onStart', 'onStop' ] as const) {
  const where = from === 'release' ? 'a release' : from === 'onStart' ? 'an onStart that saw the abort' : 'onStop during a recovery'
  contract(`C-SCOPE-02.e-${from}`, `fail() from ${where} does nothing once the scope is sealed`, { needs: from === 'onStop' ? [ 'scope.recover' ] : [] }, async ({ make }) => {
    // The Copilot suite expected this failure to win over the stop or recovery;
    // C-SCOPE-02 decides that a sealed scope ignores fail().
    const failure = new Error('reported while retiring')
    const gate = Promise.withResolvers<void>()
    let saved: LifecycleScope | undefined
    const { lifecycle } = make({
      async onStart (scope) {
        saved ??= scope
        if (from === 'onStop' || scope !== saved) {
          return
        }
        if (from === 'release') {
          scope.defer(() => { scope.fail(failure) })
        }
        await new Promise<void>(resolve => scope.signal.addEventListener('abort', () => resolve(), { once: true }))
        if (from === 'onStart') {
          scope.fail(failure)
        }
      },
      onStop: from === 'onStop' ? () => gate.promise : undefined,
    })
    if (from === 'onStop') {
      await lifecycle.start()
      assert.equal(saved!.recover(), 'accepted')
      await flush()
      saved!.fail(failure)
      gate.resolve()
      await flush()
      assert.deepEqual(lifecycle.state, { kind: 'running', generation: 2 })
    } else {
      const started = observe(lifecycle.start())
      await flush()
      const stopped = observe(lifecycle.stop())
      await flush()
      assert.equal(errorName(started.error), 'LifecycleSupersededError')
      assert.equal(stopped.status, 'resolved')
      assert.deepEqual(lifecycle.state, { kind: 'stopped', generation: 1 })
    }
    await shutdown(lifecycle)
  })
}

contract('C-SCOPE-02.f', 'a sealed scope disposes a late use() at once and throws the retirement reason', {}, async ({ make }) => {
  let saved: LifecycleScope | undefined
  let disposed = 0
  const { lifecycle } = make({ onStart (scope) { saved = scope } })
  await lifecycle.start()
  await lifecycle.stop()
  assert.throws(() => saved!.use({ [Symbol.dispose] () { disposed++ } }), (error: unknown) => errorName(error) === 'LifecycleSupersededError')
  await flush()
  assert.equal(disposed, 1)
  assert.equal(lifecycle.state.kind, 'stopped')
})

contract('C-SCOPE-05.d', 'an interrupt that completes another pending acquisition gets that resource interrupted before any release, and releases run newest first', { needs: [ 'scope.acquire', 'acquire.interrupt' ] }, async ({ make }) => {
  const events: string[] = []
  const pending = Promise.withResolvers<{ readonly name: string }>()
  const { lifecycle } = make({
    async onStart (scope) {
      await scope.acquire(
        () => ({ name: 'first' }),
        resource => { events.push(`release-${resource.name}`) },
        { interrupt: resource => {
          events.push(`interrupt-${resource.name}`)
          pending.resolve({ name: 'late' })
        } },
      )
      const acquiring = scope.acquire(
        () => pending.promise,
        resource => { events.push(`release-${resource.name}`) },
        { interrupt: resource => { events.push(`interrupt-${resource.name}`) } },
      )
      acquiring.catch(() => {})
      scope.spawn(async () => { await acquiring.catch(() => {}) })
    },
  })
  await lifecycle.start()
  const stopped = observe(lifecycle.stop())
  await flush()
  assert.equal(stopped.status, 'resolved')
  assert.deepEqual(events, [ 'interrupt-first', 'interrupt-late', 'release-late', 'release-first' ])
})

for (const mode of [ 'sync', 'async' ] as const) {
  contract(`C-SCOPE-10.a-${mode}`, `a release that ${mode === 'sync' ? 'throws' : 'returns a rejected promise'} is a cleanup error, stays owned, and the next stop() retries it`, {}, async ({ make }) => {
    const cleanupError = new Error(`${mode} release failed`)
    let calls = 0
    const { lifecycle } = make({
      onStart (scope) {
        scope.defer(() => {
          if (++calls !== 1) {
            return undefined
          }
          if (mode === 'sync') {
            throw cleanupError
          }
          return Promise.reject(cleanupError)
        })
      },
    })
    await lifecycle.start()
    const first = observe(lifecycle.stop())
    await flush()
    assert.equal(first.error, cleanupError)
    const dirty = failedState(lifecycle.state)
    assert.equal(dirty.cleanupComplete, false)
    assert.equal(dirty.cleanupError, cleanupError)
    const second = observe(lifecycle.stop())
    await flush()
    assert.equal(second.status, 'resolved')
    assert.equal(calls, 2)
    assert.equal(lifecycle.state.kind, 'stopped')
  })
}

contract('C-SCOPE-10.b', 'a release may return any value: a promise-like is awaited, and anything else is ignored', {}, async ({ make }) => {
  const emitter = new EventEmitter()
  const listener = () => {}
  let finish: (() => void) | undefined
  const { lifecycle } = make({
    onStart (scope) {
      emitter.on('tick', listener)
      scope.defer(() => emitter.off('tick', listener)) // returns the emitter (D29)
      scope.defer(() => 42)
      scope.defer(() => ({ then (resolve: () => void) { finish = resolve } }))
    },
  })
  await lifecycle.start()
  const stopped = observe(lifecycle.stop())
  await flush()
  assert.equal(stopped.status, 'pending', 'the thenable is awaited')
  assert.ok(finish, 'its then() was called')
  finish()
  await flush()
  assert.equal(stopped.status, 'resolved')
  assert.equal(emitter.listenerCount('tick'), 0)
  assert.equal(lifecycle.state.kind, 'stopped')
})

for (const value of [ undefined, null ]) {
  contract(`C-SCOPE-10.c-${String(value)}`, `a release that throws ${String(value)} while a stopped start rolls back is reported as exactly that value`, {}, async ({ make }) => {
    const { lifecycle } = make({
      async onStart (scope) {
        scope.defer(() => { throw value })
        await new Promise<void>(resolve => scope.signal.addEventListener('abort', () => resolve(), { once: true }))
      },
    })
    const started = observe(lifecycle.start())
    await flush()
    const stopped = observe(lifecycle.stop())
    await flush()
    assert.equal(errorName(started.error), 'LifecycleSupersededError')
    assert.equal(stopped.status, 'rejected')
    assert.ok(Object.is(stopped.error, value))
    const failed = failedState(lifecycle.state)
    assert.equal(failed.phase, 'stop')
    assert.ok(Object.is(failed.error, value))
    assert.equal(failed.cleanupComplete, false)
    assert.ok('cleanupError' in failed && Object.is(failed.cleanupError, value))
  })
}

contract('C-SCOPE-05.e', 'interrupts are all called at once, newest first; a pending interrupt promise holds the releases under the stop deadline, and the next stop() releases without calling any interrupt again (D38)', { needs: [ 'clock', 'scope.acquire', 'acquire.interrupt' ] }, async ({ make }) => {
  // The Copilot source awaited each interrupt before calling the next, so the
  // older one ran only after the newer one settled.
  const clock = new ManualClock()
  const blocked = Promise.withResolvers<void>()
  const interrupts: string[] = []
  const releases: string[] = []
  const { lifecycle } = make({
    async onStart (scope) {
      await scope.acquire(() => 'first', resource => { releases.push(resource) }, { interrupt: () => { interrupts.push('first') } })
      await scope.acquire(() => 'second', resource => { releases.push(resource) }, {
        interrupt: () => {
          interrupts.push('second')
          return blocked.promise
        },
      })
    },
  }, { clock, stopTimeoutMs: 5 })
  await lifecycle.start()
  const first = observe(lifecycle.stop())
  await flush()
  assert.deepEqual(interrupts, [ 'second', 'first' ], 'no interrupt waits for another')
  assert.deepEqual(releases, [], 'nothing is released while an interrupt is pending')
  await clock.advance(5)
  assert.equal(errorName(first.error), 'LifecycleTimeoutError')
  assert.equal(failedState(lifecycle.state).cleanupComplete, false)

  blocked.resolve()
  await flush()
  const second = observe(lifecycle.stop())
  await flush()
  assert.equal(second.status, 'resolved')
  assert.deepEqual(releases, [ 'second', 'first' ])
  assert.deepEqual(interrupts, [ 'second', 'first' ], 'each interrupt runs once')
  assert.equal(lifecycle.state.kind, 'stopped')
})

contract('C-SCOPE-05.f', 'a late acquisition whose interrupt returns a promise that rejects: interrupted once, released once only after that promise settles, and the rejection is a cleanup error (D38)', { needs: [ 'scope.acquire', 'acquire.interrupt' ] }, async ({ make }) => {
  const acquisition = Promise.withResolvers<string>()
  const interrupt = Promise.withResolvers<void>()
  const interruptError = new Error('late interrupt failed')
  let interrupts = 0
  let releases = 0
  let acquired: Observed<string> | undefined
  const { lifecycle } = make({
    onStart (scope) {
      acquired = observe(scope.acquire(() => acquisition.promise, () => { releases++ }, {
        interrupt: () => {
          interrupts++
          return interrupt.promise
        },
      }))
    },
  })
  await lifecycle.start()
  const stopped = observe(lifecycle.stop())
  await flush()
  assert.equal(interrupts, 0, 'the resource does not exist yet')
  acquisition.resolve('late resource')
  await flush()
  assert.equal(interrupts, 1, 'interrupted as soon as it exists')
  assert.equal(releases, 0, 'not released before its interrupt settles')
  assert.equal(stopped.status, 'pending')

  interrupt.reject(interruptError)
  await flush()
  assert.equal(errorName(acquired?.error), 'LifecycleSupersededError')
  assert.equal(stopped.error, interruptError)
  assert.equal(interrupts, 1)
  assert.equal(releases, 1)
  const failed = failedState(lifecycle.state)
  assert.equal(failed.cleanupError, interruptError)
  assert.equal(failed.cleanupComplete, true, 'the interrupt is never retried, and the resource was released')
})

// ---------------------------------------------------------------------------
// From the acceptance lists: v1 design §6, #2911 §9 and the ChatGPT review §7
// ---------------------------------------------------------------------------

contract('C-SCOPE-04.d', 'an acquisition that resolves after retirement began and whose release fails leaves cleanup debt, and the next stop() retries it', { needs: [ 'scope.acquire' ] }, async ({ make }) => {
  const creating = Promise.withResolvers<string>()
  const releaseError = new Error('late release failed')
  let releases = 0
  let acquired: Observed<string> | undefined
  const { lifecycle } = make({
    onStart (scope) {
      acquired = observe(scope.acquire(() => creating.promise, () => { if (++releases === 1) { throw releaseError } }))
    },
  })
  await lifecycle.start()
  const stopped = observe(lifecycle.stop())
  await flush()
  creating.resolve('late')
  await flush()
  assert.equal(errorName(acquired?.error), 'LifecycleSupersededError')
  assert.equal(stopped.error, releaseError)
  const dirty = failedState(lifecycle.state)
  assert.equal(dirty.cleanupComplete, false, 'recorded as unreleased, not lost')
  const retried = observe(lifecycle.stop())
  await flush()
  assert.equal(retried.status, 'resolved')
  assert.equal(releases, 2)
  assert.equal(lifecycle.state.kind, 'stopped')
})

contract('C-SCOPE-04.e', 'an onStart that throws right after acquire() resolves still releases the resource', { needs: [ 'scope.acquire' ] }, async ({ make }) => {
  const boom = new Error('after acquire')
  const released: string[] = []
  const { lifecycle } = make({
    async onStart (scope) {
      await scope.acquire(() => 'socket', resource => { released.push(resource) })
      throw boom
    },
  })
  const started = observe(lifecycle.start())
  await flush()
  assert.equal(started.error, boom)
  assert.deepEqual(released, [ 'socket' ])
  assert.equal(failedState(lifecycle.state).cleanupComplete, true)
})

// ---------------------------------------------------------------------------
// Rules that had no test of their own (S2 exit criteria)
// ---------------------------------------------------------------------------

contract('C-SCOPE-01.a', 'each generation\'s scope carries that generation\'s number and its own signal, which only its retirement aborts', {}, async ({ make }) => {
  // The adapters build the scope object each implementation's hooks receive,
  // so its identity and frozenness are the adapter's, not the implementation's.
  // Only what the adapters pass through is asserted here: the generation and
  // the signal. The final kernel's own tests check the rest of C-SCOPE-01 (S4).
  const scopes: LifecycleScope[] = []
  const { lifecycle } = make({ onStart (scope) { scopes.push(scope) } })
  await lifecycle.start()
  await lifecycle.restart()
  assert.equal(scopes.length, 2)
  assert.deepEqual(scopes.map(scope => scope.generation), [ 1, 2 ])
  assert.notEqual(scopes[0]!.signal, scopes[1]!.signal)
  assert.equal(scopes[0]!.signal.aborted, true, 'the retired generation\'s signal')
  assert.equal(scopes[1]!.signal.aborted, false)
  await shutdown(lifecycle)
})

for (const pending of [ 'release', 'interrupt' ] as const) {
  contract(`C-SCOPE-04.f-${pending}`, `an onStart awaiting a late acquisition settles while ${pending === 'release' ? 'its release is' : 'its async interrupt, and so its release, are'} still pending, and stop() still waits (D41${pending === 'interrupt' ? ', D38' : ''})`, { needs: pending === 'interrupt' ? [ 'scope.acquire', 'acquire.interrupt' ] : [ 'scope.acquire' ] }, async ({ make }) => {
    // Found by S3 (#2992): an implementation that rejects only after the release
    // leaves the acquire(), and the hook awaiting it, pending while the release
    // hangs; the generation can then never finish retiring.
    const creating = Promise.withResolvers<string>()
    const interrupting = Promise.withResolvers<void>()
    const releasing = Promise.withResolvers<void>()
    const log: string[] = []
    let hookSettled = false
    const { lifecycle } = make({
      async onStart (scope) {
        try {
          await scope.acquire(() => creating.promise, () => {
            log.push('release')
            return releasing.promise
          }, pending === 'interrupt'
            ? { interrupt: () => { log.push('interrupt'); return interrupting.promise } }
            : undefined)
        } finally {
          hookSettled = true
        }
      },
    })
    const started = observe(lifecycle.start())
    await flush()
    const stopped = observe(lifecycle.stop())
    await flush()
    creating.resolve('late')
    await flush()
    assert.equal(hookSettled, true, 'acquire() rejected at once, so the awaiting hook settled')
    assert.equal(errorName(started.error), 'LifecycleSupersededError')
    if (pending === 'interrupt') {
      assert.deepEqual(log, [ 'interrupt' ], 'not released before its interrupt settles (D38)')
      interrupting.resolve()
      await flush()
    }
    assert.deepEqual(log, pending === 'interrupt' ? [ 'interrupt', 'release' ] : [ 'release' ])
    assert.equal(stopped.status, 'pending', 'the stop() still waits for the release')
    releasing.resolve()
    await flush()
    assert.equal(stopped.status, 'resolved')
    assert.equal(lifecycle.state.kind, 'stopped')
  })
}
