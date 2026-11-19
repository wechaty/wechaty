/**
 * Cross-runtime regressions for lifecycle authority and resource ownership.
 * The same kernel contracts run through both public entry points.
 */
import assert from 'node:assert/strict'
import { channel } from 'node:diagnostics_channel'
import { test } from 'node:test'
import { setTimeout as nextTurn } from 'node:timers/promises'

import {
  AsyncLifecycle,
  createLifecycle,
  LifecycleSupersededError,
  LifecycleTimeoutError,
  LifecycleUnsafeStateError,
  type LifecycleController,
  type LifecycleHooks,
  type LifecycleOptions,
  type LifecycleScope,
  type LifecycleState,
} from './mod.ts'

/** Expose the inherited owner capabilities to the shared contract tests. */
class InheritedLifecycle extends AsyncLifecycle implements LifecycleController {
  readonly #hooks: LifecycleHooks

  constructor(hooks: LifecycleHooks, options?: LifecycleOptions) {
    super(options)
    this.#hooks = hooks
  }

  protected override onStart(scope: LifecycleScope) {
    return this.#hooks.onStart(scope)
  }

  protected override onStop(scope: LifecycleScope) {
    return this.#hooks.onStop?.(scope)
  }

  protected override onStateChange(state: LifecycleState, previous: LifecycleState) {
    this.#hooks.onStateChange?.(state, previous)
  }

  override condition(name: string) {
    return super.condition(name)
  }

  override recover(observed: LifecycleState) {
    return super.recover(observed)
  }
}

const facades = [
  ['composition', createLifecycle],
  ['inheritance', (hooks: LifecycleHooks, options?: LifecycleOptions) => new InheritedLifecycle(hooks, options)],
] as const

/** Resolve when a generation has been interrupted, even if it was already aborted. */
function interrupted(signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    return Promise.resolve()
  }
  return new Promise(resolve => signal.addEventListener('abort', () => resolve(), { once: true }))
}

/** Bind the rejection immediately so test gates cannot create unhandled rejections. */
async function rejectsWith(work: Promise<unknown>, expected: unknown): Promise<void> {
  await assert.rejects(work, error => Object.is(error, expected))
}

for (const [name, create] of facades) {
  for (const yields of [false, true]) {
    test(`${name}: startup budget includes synchronous work ${yields ? 'after' : 'before'} a microtask`, async () => {
      const service = create({
        async onStart() {
          if (yields) await Promise.resolve()
          // Timers cannot run while the hook occupies the JS thread.
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 30)
        },
      }, { startTimeoutMs: 10 })
      await assert.rejects(service.start(), error => error instanceof LifecycleTimeoutError && error.operation === 'start')
      await service.stop()
    })
  }

  test(`${name}: a detached release failure interrupts a blocked replacement hook and preserves cleanup errors`, async () => {
    const reason = new Error('detached release failed')
    const stopError = new Error('replacement stop hook failed')
    const entered = Promise.withResolvers<AbortSignal>()
    let retired: LifecycleScope | undefined
    let releases = 0
    const service = create({
      async onStart(scope) {
        if (!retired) {
          retired = scope
          return
        }
        entered.resolve(scope.signal)
        await interrupted(scope.signal)
      },
      onStop(scope) {
        if (scope !== retired) throw stopError
      },
    })
    await service.start()
    const result = service.restart().then(() => undefined, error => error)
    const signal = await entered.promise
    assert.throws(() => retired!.defer(() => {
      if (++releases === 1) throw reason
    }), LifecycleSupersededError)
    try {
      await nextTurn(0)
      assert.equal(signal.aborted, true)
      assert.equal(await result, reason)
      const failed = service.state
      assert.ok(failed.kind === 'failed' && failed.phase === 'start' && !failed.cleanupComplete)
      assert.equal(failed.error, reason)
      assert.ok(failed.cleanupError instanceof AggregateError)
      assert.deepEqual(failed.cleanupError.errors, [stopError, reason])
    } finally {
      await service.stop()
    }
    assert.equal(releases, 2)
  })

  test(`${name}: queued restart reports the detached disposer error before starting a replacement`, async () => {
    let retired: LifecycleScope | undefined
    let starts = 0
    let releases = 0
    const reason = new Error('older cleanup failed')
    const gate = Promise.withResolvers<void>()
    const service = create({ onStart(scope) { retired ??= scope; starts++ } })
    await service.start()
    await service.restart()
    assert.throws(() => retired!.defer(() => {
      return ++releases === 1 ? gate.promise : undefined
    }), LifecycleSupersededError)
    const replacement = service.restart()
    gate.reject(reason)
    await rejectsWith(replacement, reason)
    assert.equal(starts, 2)
    await service.stop()
    assert.equal(releases, 2)
  })

  for (const cleanup of ['success', 'failure', 'timeout'] as const) {
    test(`${name}: stop from the start timeout listener observes cleanup ${cleanup}`, async () => {
      const gate = Promise.withResolvers<void>()
      const reason = new Error('release failed')
      let stop!: Promise<unknown>
      let stops = 0
      let releases = 0
      const service = create({
        async onStart(scope) {
          scope.defer(() => {
            if (++releases === 1 && cleanup === 'failure') throw reason
          })
          scope.signal.addEventListener('abort', () => {
            stop = service.stop().then(() => undefined, error => error)
            if (cleanup !== 'timeout') gate.resolve()
          }, { once: true })
          await gate.promise
        },
        onStop() { stops++ },
      }, { startTimeoutMs: 10, stopTimeoutMs: cleanup === 'timeout' ? 25 : 1000 })

      await assert.rejects(service.start(), error => error instanceof LifecycleTimeoutError && error.operation === 'start')
      const result = await stop
      if (cleanup === 'failure') {
        assert.equal(result, reason)
      } else if (cleanup === 'timeout') {
        assert.ok(result instanceof LifecycleTimeoutError && result.operation === 'stop')
        assert.equal(stops, 0)
        gate.resolve()
      } else {
        assert.equal(result, undefined)
      }
      if (cleanup !== 'success') {
        assert.ok(service.state.kind === 'failed' && !service.state.cleanupComplete)
        await service.stop()
      }
      assert.equal(service.state.kind, 'stopped')
      assert.equal(stops, 1)
      assert.equal(releases, cleanup === 'failure' ? 2 : 1)
    })
  }

  for (const command of ['start', 'restart'] as const) {
    test(`${name}: ${command} from a timeout listener waits for the expired generation to retire`, async () => {
      const release = Promise.withResolvers<void>()
      const trace: string[] = []
      let replacement!: Promise<unknown>
      const service = create({
        async onStart(scope) {
          if (trace.length > 0) {
            trace.push('replacement')
            return
          }
          trace.push('first start')
          scope.defer(async () => {
            await release.promise
            trace.push('released')
          })
          scope.signal.addEventListener('abort', () => {
            replacement = service[command]().then(() => undefined, error => error)
          }, { once: true })
          await interrupted(scope.signal)
        },
      }, { startTimeoutMs: 10, stopTimeoutMs: 1000 })

      try {
        await assert.rejects(service.start(), error => error instanceof LifecycleTimeoutError && error.operation === 'start')
        assert.deepEqual(service.state, { kind: 'stopping', generation: 1 })
      } finally {
        release.resolve()
      }
      assert.equal(await replacement, undefined)
      assert.deepEqual(trace, ['first start', 'released', 'replacement'])
      assert.deepEqual(service.state, { kind: 'running', generation: 2 })
      await service.stop()
    })
  }

  for (const completion of ['already released', 'release', 'reject', 'stop', 'timeout'] as const) {
    test(`${name}: replacement startup handles detached cleanup: ${completion}`, async () => {
      const gate = Promise.withResolvers<void>()
      const entered = Promise.withResolvers<void>()
      const retired = Promise.withResolvers<void>()
      const reason = new Error('older release failed')
      const running: number[] = []
      let old: LifecycleScope | undefined
      let releases = 0
      const service = create({
        async onStart(scope) {
          if (!old) {
            old = scope
            return
          }
          scope.defer(retired.resolve)
          assert.throws(() => old!.defer(() => {
            return ++releases === 1 ? gate.promise : undefined
          }), LifecycleSupersededError)
          if (completion === 'already released') gate.resolve()
          entered.resolve()
        },
        onStateChange(state) {
          if (state.kind === 'running') running.push(state.generation)
        },
      }, { startTimeoutMs: completion === 'timeout' ? 50 : undefined })
      await service.start()
      const start = service.restart()
      // Observe failures immediately while the test drives the independent cleanup.
      const outcome = start.then(() => undefined, error => error)
      await entered.promise
      if (completion === 'already released') {
        await start
      } else if (completion === 'timeout') {
        const error = await outcome
        assert.ok(error instanceof LifecycleTimeoutError && error.operation === 'start')
        gate.resolve()
      } else {
        await nextTurn(0)
        assert.deepEqual(service.state, { kind: 'starting', generation: 2 })
        if (completion === 'release') {
          gate.resolve()
          await start
        } else if (completion === 'reject') {
          gate.reject(reason)
          await rejectsWith(start, reason)
          assert.ok(service.state.kind === 'failed' && !service.state.cleanupComplete)
        } else {
          const stop = service.stop()
          await assert.rejects(start, LifecycleSupersededError)
          await retired.promise
          gate.resolve()
          await stop
        }
      }
      assert.deepEqual(running, completion === 'release' || completion === 'already released' ? [1, 2] : [1])
      await service.stop()
      assert.equal(releases, completion === 'reject' ? 2 : 1)
    })
  }

  for (const command of ['stop', 'fail'] as const) {
    test(`${name}: ${command} retires active resources while a detached release is blocked`, { timeout: 2000 }, async () => {
      const scopes: LifecycleScope[] = []
      const released = Promise.withResolvers<void>()
      const gate = Promise.withResolvers<void>()
      const lifecycle = create({
        onStart(scope) {
          scopes.push(scope)
          if (scopes.length === 2) scope.defer(released.resolve)
        },
      })
      await lifecycle.start()
      await lifecycle.restart()
      assert.throws(() => scopes[0]!.defer(() => gate.promise), LifecycleSupersededError)
      await nextTurn(0) // Let the worker enter the detached cleanup wait.
      const stopped = command === 'stop' ? lifecycle.stop() : undefined
      if (command === 'fail') scopes[1]!.fail(new Error('lost connection'))
      try {
        await released.promise
        assert.equal(scopes[1]!.signal.aborted, true)
      } finally {
        gate.resolve()
      }
      await stopped
      await lifecycle.stop()
    })
  }

  for (const command of ['start', 'restart'] as const) {
    test(`${name}: a parent cannot claim a child's independently queued ${command}`, async () => {
      const child = create({ onStart() {} })
      let scope!: LifecycleScope
      const parent = create({ onStart(current) { scope = current } })
      await parent.start()

      const independent = child[command]()
      assert.equal(child.state.kind, 'stopped')
      await assert.rejects(scope.start(child), LifecycleUnsafeStateError)
      await independent
      await parent.stop()
      assert.equal(child.state.kind, 'running')
      await child.stop()
    })
  }

  test(`${name}: a stopped child can be claimed after its detached release settles`, async () => {
    let retired!: LifecycleScope
    const child = create({ onStart(scope) { retired = scope } })
    let owner!: LifecycleScope
    const parent = create({ onStart(scope) { owner = scope } })
    await parent.start()
    await child.start()
    await child.stop()

    const gate = Promise.withResolvers<void>()
    assert.throws(() => retired.defer(() => gate.promise), LifecycleSupersededError)
    const claim = owner.start(child)
    gate.resolve()
    await assert.rejects(claim, LifecycleUnsafeStateError)
    await child.stop()
    await owner.start(child)
    await parent.stop()
    assert.equal(child.state.kind, 'stopped')
  })

  test(`${name}: a clean failed child with an accepted stop cannot be claimed`, async () => {
    const error = new Error('first start failed')
    let first = true
    const child = create({
      onStart() {
        if (first) {
          first = false
          throw error
        }
      },
    })
    let scope!: LifecycleScope
    const parent = create({ onStart(current) { scope = current } })
    await parent.start()
    await rejectsWith(child.start(), error)
    const stop = child.stop()
    await assert.rejects(scope.start(child), LifecycleUnsafeStateError)
    await stop
    await scope.start(child)
    await parent.stop()
    assert.equal(child.state.kind, 'stopped')
  })

  test(`${name}: a replacement child remains owned until a subsequent parent stop releases it`, async () => {
    let replacement: Promise<void> | undefined
    const child = create({
      onStart() {},
      onStop() { replacement ??= child.start() },
    })
    const parent = create({ onStart: scope => scope.start(child) })
    await parent.start()
    await assert.rejects(parent.stop(), LifecycleUnsafeStateError)
    await replacement
    assert.equal(child.state.kind, 'running')
    assert.ok(parent.state.kind === 'failed' && !parent.state.cleanupComplete)
    await parent.stop()
    assert.equal(child.state.kind, 'stopped')
    assert.equal(parent.state.kind, 'stopped')
  })

  test(`${name}: one stop deadline spans the active hook and detached releases`, async () => {
    let old!: LifecycleScope
    let hooks = 0
    const lifecycle = create({
      onStart(scope) { old ??= scope },
      async onStop() {
        if (++hooks === 2) {
          await nextTurn(70)
          assert.throws(() => old.defer(() => nextTurn(70)), LifecycleSupersededError)
        }
      },
    }, { stopTimeoutMs: 100 })
    await lifecycle.start()
    await lifecycle.restart()
    const error = await lifecycle.stop().then(() => undefined, cause => cause)
    assert.ok(error instanceof LifecycleTimeoutError)
    assert.equal(error.timeoutMs, 100)
    assert.ok(lifecycle.state.kind === 'failed' && !lifecycle.state.cleanupComplete)
    await lifecycle.stop()
  })

  test(`${name}: a condition wait created during retirement binds to the next generation`, async () => {
    let scope!: LifecycleScope
    const lifecycle = create({ onStart(current) { scope = current } })
    const ready = lifecycle.condition('ready')
    await lifecycle.start()
    scope.set(ready)
    const stop = lifecycle.stop()
    let resolved = false
    const wait = ready.wait().then(() => { resolved = true })
    await stop
    assert.equal(resolved, false)
    await lifecycle.start()
    scope.set(ready)
    await wait
    await lifecycle.stop()
  })

  test(`${name}: late registrations sharing a disposer are independently retried`, async () => {
    let retired!: LifecycleScope
    const lifecycle = create({ onStart(scope) { retired = scope } })
    await lifecycle.start()
    await lifecycle.stop()
    let calls = 0
    const release = () => {
      if (++calls <= 2) throw new Error('retry release')
    }
    assert.throws(() => retired.defer(release), LifecycleSupersededError)
    assert.throws(() => retired.defer(release), LifecycleSupersededError)
    await lifecycle.whenState(state => state.kind === 'failed')
    await lifecycle.stop()
    assert.equal(calls, 4)
    assert.equal(lifecycle.state.kind, 'stopped')
  })

  for (const rejects of [false, true]) {
    test(`${name}: a run failure survives a late release that ${rejects ? 'rejects' : 'succeeds'}`, async () => {
      const scopes: LifecycleScope[] = []
      const lifecycle = create({ onStart(scope) { scopes.push(scope) } })
      await lifecycle.start()
      await lifecycle.restart()
      const gate = Promise.withResolvers<void>()
      const primary = new Error('generation two failed')
      const secondary = new Error('old release failed')
      let calls = 0
      assert.throws(() => scopes[0]!.defer(() => ++calls === 1 ? gate.promise : undefined), LifecycleSupersededError)
      scopes[1]!.fail(primary)
      const dirty = await lifecycle.whenState(state => state.kind === 'failed')
      assert.ok(dirty.kind === 'failed' && !dirty.cleanupComplete)
      const next = lifecycle.whenState(state => state !== dirty)
      if (rejects) gate.reject(secondary)
      else gate.resolve()
      const state = await next
      assert.ok(state.kind === 'failed')
      assert.equal(state.generation, 2)
      assert.equal(state.phase, 'run')
      assert.equal(state.error, primary)
      assert.equal(state.cleanupComplete, !rejects)
      assert.equal(state.cleanupError, rejects ? secondary : undefined)
      assert.equal(await lifecycle.recover(dirty), 'superseded')
      assert.equal(await lifecycle.recover(state), rejects ? 'superseded' : 'recovered')
      await lifecycle.stop()
    })
  }

  for (const stopWins of [false, true]) {
    test(`${name}: start waiting for detached cleanup ${stopWins ? 'is superseded by stop' : 'joins the surviving run'}`, async () => {
      const scopes: LifecycleScope[] = []
      const lifecycle = create({ onStart(scope) { scopes.push(scope) } })
      await lifecycle.start()
      await lifecycle.restart()
      const gate = Promise.withResolvers<void>()
      assert.throws(() => scopes[0]!.defer(() => gate.promise), LifecycleSupersededError)
      const start = lifecycle.start({ signal: AbortSignal.timeout(2000) })
      const result = stopWins ? assert.rejects(start, LifecycleSupersededError) : start
      const stop = stopWins ? lifecycle.stop() : undefined
      gate.resolve()
      await Promise.all([result, stop])
      assert.equal(scopes.length, 2)
      assert.deepEqual(lifecycle.state, { kind: stopWins ? 'stopped' : 'running', generation: 2 })
      await lifecycle.stop()
    })
  }

  test(`${name}: restart gracefully retires the old generation before a joined start`, async () => {
    const trace: string[] = []
    const lifecycle = create({
      onStart(scope) {
        trace.push('start')
        scope.defer(() => { trace.push('release') })
      },
      onStop(scope) {
        assert.equal(scope.signal.aborted, false)
        trace.push('stop')
      },
    })

    await lifecycle.start()
    const generation = lifecycle.state.generation
    await Promise.all([lifecycle.restart(), lifecycle.start()])
    assert.deepEqual(trace, ['start', 'stop', 'release', 'start'])
    assert.equal(lifecycle.state.generation, generation + 1)
    await lifecycle.stop()
  })

  test(`${name}: reentrant start from startup abort waits for the interrupted generation to retire`, async () => {
    const entered = Promise.withResolvers<void>()
    const release = Promise.withResolvers<void>()
    let replacement: Promise<void> | undefined
    const scopes: LifecycleScope[] = []
    const lifecycle = create({
      async onStart(scope) {
        scopes.push(scope)
        if (scopes.length === 1) {
          scope.signal.addEventListener('abort', () => {
            replacement = lifecycle.start()
          }, { once: true })
          entered.resolve()
          await release.promise
        }
      },
    })
    const first = assert.rejects(lifecycle.start(), LifecycleSupersededError)
    await entered.promise
    const stop = lifecycle.stop()
    assert.ok(replacement)
    release.resolve()
    await Promise.all([first, stop, replacement])
    assert.equal(scopes.length, 2)
    assert.equal(scopes[0]?.signal.aborted, true)
    assert.equal(scopes[1]?.signal.aborted, false)
    assert.deepEqual(lifecycle.state, { kind: 'running', generation: 2 })
    await lifecycle.stop()
  })

  test(`${name}: restarting during startup retires the interrupted hook before replacement`, async () => {
    const entered = Promise.withResolvers<void>()
    const trace: string[] = []
    let starts = 0
    const lifecycle = create({
      async onStart(scope) {
        trace.push(`start ${++starts}`)
        if (starts === 1) {
          entered.resolve()
          await interrupted(scope.signal)
          trace.push('first start interrupted')
        }
      },
      onStop() { trace.push('stop') },
    })
    const first = assert.rejects(lifecycle.start(), LifecycleSupersededError)
    await entered.promise
    await Promise.all([lifecycle.restart(), first])
    assert.deepEqual(trace, ['start 1', 'first start interrupted', 'stop', 'start 2'])
    await lifecycle.stop()
  })

  test(`${name}: one worker handles stop from a starting observer`, async () => {
    let stops: Promise<void> | undefined
    let entered = 0
    const lifecycle = create({
      onStart() { entered++ },
      onStateChange(state) {
        if (state.kind === 'starting') {
          stops = lifecycle.stop()
        }
      },
    })
    await assert.rejects(lifecycle.start(), LifecycleSupersededError)
    assert.ok(stops)
    await stops
    assert.equal(entered, 0)
    assert.equal(lifecycle.state.kind, 'stopped')
  })

  test(`${name}: a failed observer can restart without inheriting the old failure`, async () => {
    const reason = new Error('first attempt')
    let starts = 0
    let restart: Promise<void> | undefined
    const lifecycle = create({
      onStart() {
        if (++starts === 1) {
          throw reason
        }
      },
      onStateChange(state) {
        if (state.kind === 'failed') {
          restart = lifecycle.restart()
        }
      },
    })
    await rejectsWith(lifecycle.start(), reason)
    assert.ok(restart)
    await restart
    assert.deepEqual(lifecycle.state, { kind: 'running', generation: 2 })
    await lifecycle.stop()
  })

  test(`${name}: a task failure interrupts startup and parks the failed attempt`, async () => {
    let starts = 0
    const lifecycle = create({
      async onStart(scope) {
        starts++
        scope.spawn(async () => { throw undefined })
        await interrupted(scope.signal)
      },
    })
    await rejectsWith(lifecycle.start(), undefined)
    await nextTurn(0)
    assert.equal(starts, 1)
    assert.equal(lifecycle.state.kind, 'failed')
    assert.equal(lifecycle.state.kind === 'failed' && lifecycle.state.phase, 'run')
    await lifecycle.stop()
  })

  test(`${name}: caller abort cancels only one wait and preserves an arbitrary reason`, async () => {
    const entered = Promise.withResolvers<void>()
    const gate = Promise.withResolvers<void>()
    let starts = 0
    const lifecycle = create({
      async onStart(scope) {
        starts++
        entered.resolve()
        await gate.promise
        assert.equal(scope.signal.aborted, false)
      },
    })
    const caller = new AbortController()
    await rejectsWith(lifecycle.start({ signal: AbortSignal.abort('pre-aborted') }), 'pre-aborted')
    const first = rejectsWith(lifecycle.start({ signal: caller.signal }), 0)
    const second = lifecycle.start()
    await entered.promise
    caller.abort(0)
    await first
    gate.resolve()
    await second
    assert.equal(starts, 1)
    await lifecycle.stop()
  })

  test(`${name}: stop deadline preserves one hook barrier and live resources`, async () => {
    const gate = Promise.withResolvers<void>()
    let hooks = 0
    let releases = 0
    const lifecycle = create({
      onStart(scope) {
        scope.defer(() => { releases++ })
      },
      async onStop(scope) {
        hooks++
        await gate.promise
        assert.equal(releases, 0)
        assert.equal(scope.signal.aborted, false)
      },
    }, { stopTimeoutMs: 10 })

    await lifecycle.start()
    await assert.rejects(lifecycle.stop(), LifecycleTimeoutError)
    assert.equal(releases, 0)
    assert.equal(hooks, 1)
    assert.equal(lifecycle.state.kind === 'failed' && lifecycle.state.cleanupComplete, false)
    await assert.rejects(lifecycle.restart(), LifecycleUnsafeStateError)
    const retry = lifecycle.stop()
    gate.resolve()
    await retry
    assert.equal(hooks, 1)
    assert.equal(releases, 1)
  })

  test(`${name}: a late stop-hook rejection stays observed and is reported once`, async () => {
    const gate = Promise.withResolvers<void>()
    const cause = new Error('late stop-hook rejection')
    let calls = 0
    const lifecycle = create({
      onStart() {},
      onStop() {
        calls++
        return gate.promise
      },
    }, { stopTimeoutMs: 10 })
    await lifecycle.start()
    await assert.rejects(lifecycle.stop(), LifecycleTimeoutError)
    const stop = rejectsWith(lifecycle.stop(), cause)
    gate.reject(cause)
    await stop
    assert.equal(lifecycle.state.kind, 'failed')
    assert.equal(lifecycle.state.kind === 'failed' && lifecycle.state.cleanupError, cause)
    await lifecycle.stop()
    assert.equal(calls, 1)
  })

  test(`${name}: start deadline reports dirty failure until the same startup hook settles`, async () => {
    const gate = Promise.withResolvers<void>()
    let goodbye = 0
    const lifecycle = create({
      onStart() { return gate.promise },
      onStop() { goodbye++ },
    }, { startTimeoutMs: 10 })
    await assert.rejects(lifecycle.start(), LifecycleTimeoutError)
    assert.equal(lifecycle.state.kind === 'failed' && lifecycle.state.cleanupComplete, false)
    await assert.rejects(lifecycle.start(), LifecycleUnsafeStateError)
    const stop = lifecycle.stop()
    gate.reject(new Error('late startup failure'))
    await stop
    assert.equal(goodbye, 1)
    assert.equal(lifecycle.state.kind, 'stopped')
  })

  test(`${name}: a timed-out disposer is joined, and only failed entries are retried`, async () => {
    const gate = Promise.withResolvers<void>()
    const reason = new Error('first release failed')
    const trace: string[] = []
    let tries = 0
    const lifecycle = create({
      onStart(scope) {
        scope.defer(() => { trace.push('first') })
        scope.defer(() => {
          trace.push('second')
          if (++tries === 1) {
            return gate.promise
          }
          return undefined
        })
      },
    }, { stopTimeoutMs: 10 })
    await lifecycle.start()
    await assert.rejects(lifecycle.stop(), LifecycleTimeoutError)
    const retry = rejectsWith(lifecycle.stop(), reason)
    gate.reject(reason)
    await retry
    assert.deepEqual(trace, ['second', 'first'])
    await lifecycle.stop()
    assert.deepEqual(trace, ['second', 'first', 'second'])
  })

  test(`${name}: the stop deadline includes task joins and keeps their resources live`, async () => {
    const taskEntered = Promise.withResolvers<void>()
    const finishTask = Promise.withResolvers<void>()
    let released = false
    const lifecycle = create({
      onStart(scope) {
        scope.defer(() => { released = true })
        scope.spawn(async () => {
          taskEntered.resolve()
          await interrupted(scope.signal)
          await finishTask.promise
          assert.equal(released, false)
        })
      },
    }, { stopTimeoutMs: 10 })

    await lifecycle.start()
    await taskEntered.promise
    await assert.rejects(lifecycle.stop(), LifecycleTimeoutError)
    assert.equal(released, false)
    const stop = lifecycle.stop()
    finishTask.resolve()
    await stop
    assert.equal(released, true)
  })

  test(`${name}: a throwing stop hook rejects after the other releases run`, async () => {
    let released = false
    const lifecycle = create({
      onStart(scope) {
        scope.defer(() => { released = true })
      },
      onStop() { throw null },
    })
    await lifecycle.start()
    await rejectsWith(lifecycle.stop(), null)
    assert.equal(released, true)
    assert.equal(lifecycle.state.kind, 'failed')
    assert.equal(lifecycle.state.kind === 'failed' && lifecycle.state.error, null)
    await lifecycle.stop()
  })

  test(`${name}: abort interrupts I/O, tasks finish with live resources, then disposers run in reverse`, async () => {
    const taskEntered = Promise.withResolvers<void>()
    const ioCanceled = Promise.withResolvers<void>()
    const stopOrder: string[] = []
    const lifecycle = create({
      onStart(scope) {
        scope.defer(() => { stopOrder.push('close transport') })
        scope.defer(() => { stopOrder.push('release subscription') })
        scope.signal.addEventListener('abort', () => {
          stopOrder.push('interrupt I/O')
          ioCanceled.resolve()
        }, { once: true })
        scope.spawn(async () => {
          taskEntered.resolve()
          await ioCanceled.promise
          await Promise.resolve()
          stopOrder.push('finish task using transport')
        })
      },
      onStop() { stopOrder.push('graceful goodbye') },
    })
    await lifecycle.start()
    await taskEntered.promise
    await lifecycle[Symbol.asyncDispose]()
    assert.deepEqual(stopOrder, [
      'graceful goodbye', 'interrupt I/O', 'finish task using transport', 'release subscription', 'close transport',
    ])
  })

  test(`${name}: abort seals the scope before a callback can register a resource`, async () => {
    const entered = Promise.withResolvers<void>()
    let calls = 0
    const lifecycle = create({
      async onStart(scope) {
        scope.signal.addEventListener('abort', () => {
          assert.throws(() => scope.adopt({}, () => { calls++ }), LifecycleSupersededError)
          assert.equal(calls, 1)
        }, { once: true })
        entered.resolve()
        await interrupted(scope.signal)
      },
    })
    const startup = assert.rejects(lifecycle.start(), LifecycleSupersededError)
    await entered.promise
    await lifecycle.stop()
    await startup
    assert.equal(calls, 1)
  })

  test(`${name}: a detached scope's failed late release blocks startup and can be retried`, async () => {
    const reason = new Error('late release')
    let remembered!: LifecycleScope
    let tries = 0
    const lifecycle = create({ onStart(scope) { remembered = scope } })
    await lifecycle.start()
    await lifecycle.stop()
    assert.throws(() => remembered.defer(() => {
      if (++tries === 1) {
        throw reason
      }
    }), LifecycleSupersededError)
    const failed = await lifecycle.whenState(state => state.kind === 'failed')
    assert.equal(failed.kind === 'failed' && failed.cleanupComplete, false)
    assert.equal(failed.kind === 'failed' && failed.cleanupError, reason)
    await assert.rejects(lifecycle.start(), LifecycleUnsafeStateError)
    await lifecycle.stop()
    assert.equal(tries, 2)
    await lifecycle.start()
    await lifecycle.stop()
  })

  test(`${name}: child startup is canceled before parent startup is joined`, async () => {
    const entered = Promise.withResolvers<void>()
    let childAborted = false
    const child = create({
      async onStart(scope) {
        entered.resolve()
        await interrupted(scope.signal)
        childAborted = true
      },
    })
    const parent = create({ onStart: scope => scope.start(child) })
    const startup = assert.rejects(parent.start(), LifecycleSupersededError)
    await entered.promise
    await parent.stop()
    await startup
    assert.equal(childAborted, true)
    assert.equal(child.state.kind, 'stopped')
    assert.equal(parent.state.kind, 'stopped')
  })

  test(`${name}: a rejected child start fails its parent without an extra rejection`, async () => {
    const reason = new Error('child failed')
    const child = create({ onStart() { throw reason } })
    const parent = create({ onStart: scope => scope.start(child) })
    await rejectsWith(parent.start(), reason)
    assert.equal(parent.state.kind, 'failed')
    assert.equal(child.state.kind, 'stopped')
    await parent.stop()
  })

  test(`${name}: each failed snapshot can authorize its own recovery`, async () => {
    let scope!: LifecycleScope
    const lifecycle = create({ onStart(value) { scope = value } })
    await lifecycle.start()
    for (let generation = 1; generation <= 2; generation++) {
      const failed = lifecycle.whenState(state => state.kind === 'failed')
      scope.fail(generation)
      const snapshot = await failed
      const recovery = lifecycle.recover(snapshot)
      assert.equal(await lifecycle.recover(snapshot), 'superseded')
      assert.equal(await recovery, 'recovered')
      assert.deepEqual(lifecycle.state, { kind: 'running', generation: generation + 1 })
    }
    await lifecycle.stop()
  })

  test(`${name}: stop supersedes an accepted recovery before its replacement can run`, async () => {
    let firstScope!: LifecycleScope
    const replacement = Promise.withResolvers<void>()
    const lifecycle = create({
      async onStart(scope) {
        if (!firstScope) {
          firstScope = scope
        } else {
          replacement.resolve()
          await interrupted(scope.signal)
        }
      },
    })
    await lifecycle.start()
    const failed = lifecycle.whenState(state => state.kind === 'failed')
    firstScope.fail(new Error('requires recovery'))
    const snapshot = await failed
    const recovery = lifecycle.recover(snapshot)
    await replacement.promise
    await lifecycle.stop()
    assert.equal(await recovery, 'superseded')
    assert.equal(await lifecycle.recover(snapshot), 'superseded')
    assert.equal(lifecycle.state.kind, 'stopped')
  })

  test(`${name}: a runtime failure settles an owned stop retry after dirty cleanup`, async () => {
    const reason = new Error('release failed')
    let tries = 0
    let current!: LifecycleScope
    const lifecycle = create({
      onStart(scope) {
        current = scope
        scope.defer(() => {
          if (++tries === 1) {
            throw reason
          }
        })
      },
    })
    await lifecycle.start()
    const failed = lifecycle.whenState(state => state.kind === 'failed')
    current.fail(new Error('runtime failure'))
    const snapshot = await failed
    assert.equal(snapshot.kind === 'failed' && snapshot.cleanupError, reason)
    await lifecycle.stop()
    assert.equal(tries, 2)
    assert.equal(lifecycle.state.kind, 'stopped')
  })
}

test('an owned child propagates its committed failure cause to its parent', async () => {
  const reason = new Error('child run failed')
  let childScope!: LifecycleScope
  const child = createLifecycle({ onStart(scope) { childScope = scope } })
  const parent = createLifecycle({ onStart: scope => scope.start(child) })
  await parent.start()
  const failed = parent.whenState(state => state.kind === 'failed')
  childScope.fail(reason)
  const snapshot = await failed
  assert.ok(snapshot.kind === 'failed' && snapshot.error instanceof Error)
  assert.equal(snapshot.error.cause, reason)
  await parent.stop()
})

test('a stopped child remains owned until its first parent retires it', async () => {
  const gate = Promise.withResolvers<void>()
  const child = createLifecycle({ onStart() {} })
  const parent = createLifecycle({
    onStart: scope => scope.start(child),
    onStop: () => gate.promise,
  })
  const another = createLifecycle({ onStart: scope => scope.start(child) })
  await parent.start()
  await child.stop()
  const failed = parent.whenState(state => state.kind === 'failed')
  await assert.rejects(another.start(), LifecycleUnsafeStateError)
  gate.resolve()
  await failed
  await another.start()
  await another.stop()
})

test('a three-level mix of the facades starts top-down and retires nested resources in reverse', async () => {
  const trace: string[] = []
  const provider = new InheritedLifecycle({
    onStart(scope) {
      trace.push('start provider')
      scope.defer(() => { trace.push('release provider') })
    },
  })
  const puppet = createLifecycle({
    async onStart(scope) {
      trace.push('start puppet')
      scope.defer(() => { trace.push('release puppet') })
      await scope.start(provider)
    },
  })
  const wechaty = new InheritedLifecycle({
    async onStart(scope) {
      trace.push('start wechaty')
      scope.defer(() => { trace.push('release wechaty') })
      await scope.start(puppet)
    },
  })

  await wechaty.start()
  await wechaty.stop()
  assert.deepEqual(trace, [
    'start wechaty', 'start puppet', 'start provider',
    'release provider', 'release puppet', 'release wechaty',
  ])
  for (const lifecycle of [wechaty, puppet, provider]) {
    assert.equal(lifecycle.state.kind, 'stopped')
  }
})

test('a failure observer cannot recover over a stop accepted in that same observer', async () => {
  const cause = new Error('startup failed')
  let stop: Promise<void> | undefined
  let recovery: Promise<'recovered' | 'superseded'> | undefined
  const lifecycle = createLifecycle({
    onStart() { throw cause },
    onStateChange(state) {
      if (state.kind === 'failed') {
        stop = lifecycle.stop()
        recovery = lifecycle.recover(state)
      }
    },
  })
  await rejectsWith(lifecycle.start(), cause)
  await stop
  assert.equal(await recovery, 'superseded')
  assert.deepEqual(lifecycle.state, { kind: 'stopped', generation: 1 })
})

test('inheritance rejects command overrides from intermediate classes and class fields', () => {
  class Shadow extends AsyncLifecycle {
    protected override onStart(): void {}
    override start(): Promise<void> { return Promise.resolve() }
  }
  class Concrete extends Shadow {
    constructor() { super() }
  }
  class Field extends AsyncLifecycle {
    override stop = () => Promise.resolve()

    constructor() { super() }

    protected override onStart(): void {}
  }

  assert.throws(() => new Concrete(), /must not override "start"/)
  assert.throws(() => new Field(), TypeError)
})

test('conditions are local to their owner and stale generations cannot make a replacement ready', async () => {
  const scopes: LifecycleScope[] = []
  const lifecycle = createLifecycle({ onStart(scope) { scopes.push(scope) } })
  const other = createLifecycle({ onStart() {} })
  const ready = lifecycle.condition('ready')
  const foreign = other.condition('ready')
  const signal = new AbortController()

  const first = ready.wait()
  await lifecycle.start()
  scopes[0]?.set(foreign)
  assert.equal('interrupt' in scopes[0]!, false)
  const canceled = rejectsWith(ready.wait({ signal: signal.signal }), 'canceled')
  signal.abort('canceled')
  await canceled
  scopes[0]?.set(ready)
  await first

  await lifecycle.restart()
  const second = assert.rejects(ready.wait(), LifecycleSupersededError)
  scopes[0]?.set(ready)
  await lifecycle.stop()
  await second
})

test('diagnostics are synchronous, post-commit, and structural', async () => {
  const error = new Error('private application failure')
  const cleanup = new Error('private cleanup failure')
  const lifecycle = createLifecycle({
    onStart(scope) {
      scope.defer(() => { throw cleanup })
      throw error
    },
    onStateChange() { throw new Error('observer errors are isolated') },
  }, { name: 'test lifecycle' })
  const transitions = channel('wechaty.async_lifecycle')
  const records: unknown[] = []
  const committed: LifecycleState[] = []
  const listener = (data: unknown) => {
    records.push(data)
    committed.push(lifecycle.state)
  }
  transitions.subscribe(listener)
  try {
    await rejectsWith(lifecycle.start(), error)
    assert.deepEqual(committed.map(state => state.kind), ['starting', 'stopping', 'failed'])
    const failed = committed.at(-1)
    assert.equal(failed?.kind === 'failed' && failed.cleanupError, cleanup)
    assert.deepEqual(records.at(-1), {
      name: 'test lifecycle',
      previous: { kind: 'stopping', generation: 1 },
      state: { kind: 'failed', generation: 1, phase: 'start', cleanupComplete: false },
    })
  } finally {
    transitions.unsubscribe(listener)
  }
})
