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
 * The S3 random-schedule runner (wechaty/wechaty#2971).
 *
 * A schedule is a short list of {@link Step}s generated from a seed: caller
 * commands, scope actions, settling pending hooks and releases, and advancing
 * the manual clock. The runner executes it against one implementation through
 * its S2 adapter, with every hook, release, task and observer instrumented, and
 * reports every violation of the invariants below. It is not a model of the
 * state machine: it never predicts an exact state, it only checks properties
 * that must hold on every schedule (#2971, "Out of scope").
 *
 * | ID | Invariant |
 * | --- | --- |
 * | I1 | No overlap: when a generation's `onStart` is entered, every earlier generation's hooks and tasks have settled and its own resources are released; late releases (D31) are excused until `running` |
 * | I2 | `running` is never committed for a generation whose signal is aborted |
 * | I3 | When a `stop()` resolves, every resource of the generation it captured, and of every earlier one, was released, and so was every late release (D31) already running when it was accepted, unless a newer generation started; no resource is ever released after a successful release |
 * | I4 | `stopped` and `failed { cleanupComplete: true }` hold no resource, no pending creation, no running hook or task, and no started child; checked at each such commit, after every step and after draining |
 * | I5 | Every promise handed to a caller, `scope.acquire()` included, settles once the schedule drains. An `acquire()` that never settles while its own release is still running is reported as `I5.acquire`, so that case (D41) can be waived without hiding other hangs |
 * | I6 | No unhandled rejection |
 * | I7 | `onStop` runs at most once per generation, and only for one that committed `running` (D8) |
 * | I8 | A stale scope changes nothing: its `fail()` error never shows up in the state, its `recover()` returns `'superseded'` (D42), and its `set()` / `clear()` leave `isSet` unchanged |
 * | I9 | Snapshots are frozen, and generation numbers never decrease |
 * | I10 | Observers (`onStateChange`, `whenState` predicates) see the state that is already committed |
 * | I11 | Liveness: when no behavior hung forever, draining ends `stopped` |
 *
 * Rules that keep schedules valid, so no alarm comes from the generator itself:
 * - Without the `clock` capability nothing hangs forever and no deadline is
 *   set, so a schedule can never wait on real time (Codex uses real timers).
 * - With it, both deadlines are always set, so a hang-forever behavior ends
 *   in a timeout, not a hang.
 * - A release retried after a failure succeeds, so cleanup debt can clear.
 * - Every caller wait has its own abort signal, aborted when the run drains.
 *
 * Lifecycle promises are observed with `observe()` and never awaited, so an
 * implementation that hangs fails a check instead of hanging the run.
 */

import process from 'node:process'
import { setImmediate } from 'node:timers'

import type {
  Lifecycle,
  LifecycleCondition,
  LifecycleScope,
  LifecycleState,
  LifecycleStop,
}                           from '../../types.ts'
import { flush, ManualClock, observe, type Observed } from '../harness.ts'
import type { Capability, MakeSubject } from '../subject.ts'
import { Random } from './prng.ts'

/** What a step does. Each draws the details it needs from its `n`. */
type Op =
  | 'start' | 'stop' | 'restart' | 'abort' | 'whenState' | 'wait'
  | 'resolve' | 'reject' | 'advance' | 'flush'
  | 'fail' | 'recover' | 'set' | 'clear' | 'acquire' | 'use' | 'defer' | 'spawn'
  | 'child' | 'child-stop'
  | 'stale-fail' | 'stale-recover' | 'stale-set' | 'late-defer'

/** One schedule step: an operation, and a random number for its choices. */
interface Step {
  readonly op: Op
  readonly n: number
}

/** A replayable schedule. */
interface Schedule {
  readonly seed: number
  readonly steps: readonly Step[]
}

/** One broken invariant. */
interface Violation {
  readonly invariant: string
  readonly step: number
  readonly message: string
}

/** The operations a schedule may use, by weight, given what an implementation supports. */
function opWeights (capabilities: ReadonlySet<Capability>): Partial<Record<Op, number>> {
  const weights: Partial<Record<Op, number>> = {
    'start'       : 8,
    'stop'        : 6,
    'restart'     : 4,
    'abort'       : 2,
    'whenState'   : 2,
    'wait'        : 2,
    'resolve'     : 10,
    'reject'      : 4,
    'flush'       : 3,
    'fail'        : 2,
    'set'         : 2,
    'clear'       : 1,
    'use'         : 2,
    'defer'       : 2,
    'spawn'       : 2,
    'child'       : 2,
    'child-stop'  : 1,
    'stale-fail'  : 1,
    'stale-set'   : 1,
    'late-defer'  : 2,
  }
  if (capabilities.has('clock')) {
    weights.advance = 5
  }
  if (capabilities.has('scope.recover')) {
    weights.recover = 2
    weights['stale-recover'] = 1
  }
  if (capabilities.has('scope.acquire')) {
    weights.acquire = 3
  }
  return weights
}

/** Generate a schedule of `length` steps for `seed`. */
function generate (seed: number, capabilities: ReadonlySet<Capability>, length = 30): Schedule {
  const random = new Random(seed)
  const weights = opWeights(capabilities)
  const steps: Step[] = []
  for (let i = 0; i < length; i++) {
    steps.push({ op: random.weighted(weights), n: random.int(2 ** 31) })
  }
  return { seed, steps }
}

/** The resources a hook or step can register on a scope. */
type ResourceKind = 'defer' | 'use' | 'acquire' | 'spawn'

/** What happens to a registered obligation: tracked to check I1, I3 and I4. */
interface Obligation {
  readonly id: number
  readonly generation: number
  readonly late: boolean
  /** For `acquire`: `create` was called. A sealed scope refuses without calling it (C-SCOPE-02). */
  called: boolean
  created: boolean
  dropped: boolean
  attempts: number
  released: number
}

/** What the runner knows about one generation. */
interface Generation {
  readonly scope: LifecycleScope
  hooks: number
  tasks: number
  stops: number
  running: boolean
  ended: boolean
}

/** A pending promise the schedule can settle with a `resolve` or `reject` step. */
interface Gate {
  readonly label: string
  settle (ok: boolean): void
}

/** A promise handed to a caller, with the signal that can cancel its wait. */
interface Call {
  readonly label: string
  readonly observed: Observed<unknown>
  readonly controller?: AbortController
  readonly check?: (value: unknown) => string | undefined
  /** The code to report when it never settles; `I5` by default. */
  readonly invariant?: () => string
}

/**
 * Microtask turns to spin after a step. Fewer than the harness default: a run
 * spins after every step and every timer, and under `node --test` each turn is
 * costly. The final settlement check (I5) still uses the full default.
 */
const TURNS = 50

const KINDS = [ 'stopped', 'starting', 'running', 'stopping', 'failed' ] as const
const FALSY = [ undefined, null, 0, '', false ] as const

/** Behaviors of hooks, releases and tasks, by weight. `forever` needs a clock. */
function behaviors (capabilities: ReadonlySet<Capability>) {
  const forever = capabilities.has('clock') ? 1 : 0
  return {
    onStart : { return: 5, gate: 6, throw: 2, falsy: 1, abort: 3, forever, stop: 1, restart: 1, start: 1 },
    onStop  : { return: 6, gate: 4, throw: 2, falsy: 1, forever, abort: capabilities.has('onStop.context') ? 2 : 0 },
    release : { ok: 8, throw: 2, reject: 2, gate: 3, forever },
    task    : { abort: 4, gate: 3, fail: 2, recover: capabilities.has('scope.recover') ? 1 : 0 },
    create  : { value: 4, gate: 3, throw: 1 },
  } as const
}

/**
 * Run one schedule against one implementation and entry point, and return
 * every invariant violation found (none means the schedule passed).
 *
 * @param log - Receives a line per step, drawn behavior, settled gate and
 *   commit, for debugging a failing schedule. Omitted in normal runs.
 */
async function run (make: MakeSubject, capabilities: ReadonlySet<Capability>, schedule: Schedule, log?: (line: string) => void): Promise<Violation[]> {
  const behavior = new Random(schedule.seed ^ 0x9E3779B9)
  const table = behaviors(capabilities)
  const clock = capabilities.has('clock') ? new ManualClock(TURNS) : undefined
  const violations: Violation[] = []
  const generations = new Map<number, Generation>()
  const obligations: Obligation[] = []
  const gates: Gate[] = []
  const calls: Call[] = []
  const staleErrors = new Set<unknown>()
  const children: Lifecycle[] = []
  const claimed = new Set<Lifecycle>()
  let lifecycle!: Lifecycle
  let ready!: LifecycleCondition
  let step = -1
  let lastGeneration = 0
  let hungForever = false
  let nextId = 0

  const violate = (invariant: string, message: string) => {
    violations.push({ invariant, step, message })
  }
  const unhandled = (reason: unknown) => {
    violate('I6', `unhandled rejection: ${describe(reason)}`)
  }

  /** A promise the schedule settles later with `resolve` / `reject` steps. */
  const gate = (label: string, onSettle?: (ok: boolean) => void): Promise<void> => {
    const { promise, resolve, reject } = Promise.withResolvers<void>()
    const entry: Gate = {
      label,
      settle: ok => {
        log?.(`  settle ${label}: ${ok ? 'resolve' : 'reject'}`)
        gates.splice(gates.indexOf(entry), 1)
        onSettle?.(ok)
        if (ok) {
          resolve()
        } else {
          reject(new Error(`${label} rejected`))
        }
      },
    }
    gates.push(entry)
    return promise
  }

  const forever = (): Promise<never> => {
    hungForever = true
    return new Promise<never>(() => {})
  }

  const untilAbort = (signal: AbortSignal): Promise<void> => new Promise(resolve => {
    if (signal.aborted) {
      resolve()
    } else {
      signal.addEventListener('abort', () => resolve(), { once: true })
    }
  })

  /** Count a hook or task as running until `work` settles. */
  const track = (generation: Generation, field: 'hooks' | 'tasks', work: unknown) => {
    if (work && typeof (work as PromiseLike<unknown>).then === 'function') {
      generation[field]++
      Promise.resolve(work).then(() => { generation[field]-- }, () => { generation[field]-- })
    }
    return work
  }

  /** A release function for an obligation, drawing its behavior on the first attempt. */
  const releaser = (obligation: Obligation) => (): unknown => {
    obligation.attempts++
    if (obligation.released > 0) {
      violate('I3', `obligation ${obligation.id} (generation ${obligation.generation}) released again after it succeeded`)
      return undefined
    }
    const kind = obligation.attempts === 1 ? behavior.weighted(table.release) : 'ok'
    log?.(`  release ${obligation.id} (generation ${obligation.generation}${obligation.late ? ', late' : ''}) attempt ${obligation.attempts}: ${kind}`)
    const done = () => { obligation.released++ }
    switch (kind) {
      case 'ok':
        done()
        return undefined
      case 'throw':
        throw new Error(`release ${obligation.id} failed`)
      case 'reject':
        return Promise.reject(new Error(`release ${obligation.id} rejected`))
      case 'gate':
        return gate(`release ${obligation.id}`, ok => { if (ok) { done() } })
      case 'forever':
        return forever()
    }
  }

  const register = (generation: number, created = true): Obligation => {
    const record = generations.get(generation)
    const obligation: Obligation = { id: nextId++, generation, late: record?.ended ?? false, called: created, created, dropped: false, attempts: 0, released: 0 }
    obligations.push(obligation)
    return obligation
  }

  const kinds: readonly ResourceKind[] = capabilities.has('scope.acquire') ? [ 'defer', 'use', 'acquire', 'spawn' ] : [ 'defer', 'use', 'spawn' ]

  /** Register one resource of `kind` on `scope`. */
  const resource = (scope: LifecycleScope, kind: ResourceKind) => {
    const generation = generations.get(scope.generation)
    try {
      if (kind === 'defer') {
        scope.defer(releaser(register(scope.generation)))
      } else if (kind === 'use') {
        const release = releaser(register(scope.generation))
        scope.use({ [Symbol.asyncDispose]: async () => { await release() } })
      } else if (kind === 'acquire') {
        const obligation = register(scope.generation, false)
        const release = releaser(obligation)
        const create = () => {
          obligation.called = true
          const how = behavior.weighted(table.create)
          if (how === 'throw') {
            obligation.dropped = true
            throw new Error(`create ${obligation.id} failed`)
          }
          if (how === 'gate') {
            return gate(`create ${obligation.id}`, ok => { if (ok) { obligation.created = true } else { obligation.dropped = true } }).then(() => obligation.id)
          }
          obligation.created = true
          return obligation.id
        }
        const interrupt = capabilities.has('acquire.interrupt') ? { interrupt: () => {} } : undefined
        // A late acquisition rejects without waiting for its release (D41), so
        // this must settle even when that release hangs forever. Only that case
        // is reported as I5.acquire, so a waiver for it hides no other hang.
        calls.push({
          label     : `scope.acquire() ${obligation.id}`,
          observed  : observe(scope.acquire(create, () => release(), interrupt)),
          invariant : () => (obligation.created && obligation.attempts > 0 && obligation.released === 0 ? 'I5.acquire' : 'I5'),
        })
      } else if (generation) {
        scope.spawn(async signal => {
          const how = behavior.weighted(table.task)
          if (how === 'recover') {
            // recover() returns its decision at once (D42); the task is joined
            // like any other, so it returns once its signal aborts (C-REC-05).
            // Promise.resolve() also accepts an implementation that returns a
            // promise (the S2 comparison kernels did, before D42).
            calls.push({ label: `recover() from a task of generation ${scope.generation}`, observed: observe(Promise.resolve(scope.recover())) })
            await track(generation, 'tasks', untilAbort(signal))
            return
          }
          const work = how === 'abort' ? untilAbort(signal) : gate(`task ${scope.generation}`)
          await track(generation, 'tasks', work)
          if (how === 'fail') {
            throw new Error(`task of generation ${scope.generation} failed`)
          }
        })
      }
    } catch {
      // A sealed scope releases the registration at once and throws (C-SCOPE-02).
    }
  }

  /** Check I1 (or its stricter form at `running`) against every earlier generation. */
  const checkNoOverlap = (generation: number, includeLate: boolean, invariant: string, when: string) => {
    for (const [ earlier, record ] of generations) {
      if (earlier >= generation) {
        continue
      }
      if (record.hooks > 0 || record.tasks > 0) {
        violate(invariant, `${when} ${generation}, generation ${earlier} still has ${record.hooks} hook(s) and ${record.tasks} task(s) running`)
      }
    }
    for (const obligation of obligations) {
      if (obligation.generation < generation && (includeLate || !obligation.late) && holds(obligation)) {
        violate(code(invariant, obligation), `${when} ${generation}, ${name(obligation)} is not released`)
      }
    }
  }

  /** Violations on a late release (D31) get their own code, so they can be told apart. */
  const code = (invariant: string, obligation: Obligation) => (obligation.late ? `${invariant}.late` : invariant)
  const name = (obligation: Obligation) => `${obligation.late ? 'late ' : ''}obligation ${obligation.id} of generation ${obligation.generation}`

  const holds = (obligation: Obligation) => obligation.called && !obligation.dropped && obligation.released === 0

  const hooks = {
    onStart: (scope: LifecycleScope) => {
      checkNoOverlap(scope.generation, false, 'I1', 'onStart of generation')
      const record: Generation = { scope, hooks: 0, tasks: 0, stops: 0, running: false, ended: false }
      generations.set(scope.generation, record)
      for (let count = behavior.int(3); count > 0; count--) {
        resource(scope, behavior.pick(kinds))
      }
      const kind = behavior.weighted(table.onStart)
      log?.(`  onStart ${scope.generation}: ${kind}`)
      switch (kind) {
        case 'return':
          return undefined
        case 'throw':
          throw new Error(`onStart ${scope.generation} failed`)
        case 'falsy':
          throw behavior.pick(FALSY)
        case 'gate':
          return track(record, 'hooks', gate(`onStart ${scope.generation}`)) as Promise<void>
        case 'abort':
          return track(record, 'hooks', untilAbort(scope.signal)) as Promise<void>
        case 'forever':
          return track(record, 'hooks', forever()) as Promise<void>
        default:
          // A hook that calls a command reentrantly (C-OBS-03).
          calls.push({ label: `onStart ${scope.generation} ${kind}()`, observed: observe(lifecycle[kind]()) })
          return undefined
      }
    },
    onStop: (stop: LifecycleStop) => {
      const record = generations.get(stop.generation)
      if (!record) {
        violate('I7', `onStop called for generation ${stop.generation}, whose onStart never ran`)
        return undefined
      }
      record.stops++
      if (record.stops > 1) {
        violate('I7', `onStop called ${record.stops} times for generation ${stop.generation}`)
      }
      if (!record.running) {
        violate('I7', `onStop called for generation ${stop.generation}, which never committed running (D8)`)
      }
      const kind = behavior.weighted(table.onStop)
      log?.(`  onStop ${stop.generation}: ${kind}`)
      switch (kind) {
        case 'return':
          return undefined
        case 'throw':
          throw new Error(`onStop ${stop.generation} failed`)
        case 'falsy':
          throw behavior.pick(FALSY)
        case 'gate':
          return track(record, 'hooks', gate(`onStop ${stop.generation}`)) as Promise<void>
        case 'abort':
          return track(record, 'hooks', untilAbort(stop.signal)) as Promise<void>
        case 'forever':
          return track(record, 'hooks', forever()) as Promise<void>
      }
    },
    onStateChange: (state: LifecycleState) => {
      log?.(`  commit ${describeState(state)}`)
      checkSnapshot(state, 'onStateChange')
      const current = lifecycle.state
      if (!sameState(current, state)) {
        violate('I10', `onStateChange saw ${describeState(state)} while the committed state is ${describeState(current)}`)
      }
      for (const [ generation, record ] of generations) {
        if (generation < state.generation || (generation === state.generation && (state.kind === 'stopped' || state.kind === 'failed'))) {
          record.ended = true
        }
      }
      if (state.kind === 'running') {
        const record = generations.get(state.generation)
        if (record) {
          record.running = true
          if (record.scope.signal.aborted) {
            violate('I2', `running committed for generation ${state.generation}, whose signal is aborted`)
          }
        }
        checkNoOverlap(state.generation, true, 'I1', 'running committed for generation')
      }
      if (state.kind === 'stopped' || (state.kind === 'failed' && state.cleanupComplete)) {
        checkClean(state)
      }
      for (const error of staleErrors) {
        if (state.kind === 'failed' && (state.error === error || state.cleanupError === error)) {
          violate('I8', `a stale scope's fail() error shows up in ${describeState(state)}`)
        }
      }
    },
  }

  /**
   * I4 on the current snapshot, without waiting for a commit: an implementation
   * that wrongly stays `stopped` while a late release runs commits nothing.
   */
  const checkIdle = () => {
    const state = lifecycle.state
    if (state.kind === 'stopped' || (state.kind === 'failed' && state.cleanupComplete)) {
      checkClean(state)
    }
  }

  /** I4: a clean idle state holds nothing. */
  const checkClean = (state: LifecycleState) => {
    for (const obligation of obligations) {
      if (obligation.generation <= state.generation && holds(obligation)) {
        violate(code('I4', obligation), `${describeState(state)} committed while ${name(obligation)} is not released${obligation.created ? '' : ' (still being created)'}`)
      }
    }
    for (const [ generation, record ] of generations) {
      if (generation <= state.generation && (record.hooks > 0 || record.tasks > 0)) {
        violate('I4', `${describeState(state)} committed while generation ${generation} still has ${record.hooks} hook(s) and ${record.tasks} task(s) running`)
      }
    }
    for (const child of claimed) {
      if (child.state.kind === 'running' || child.state.kind === 'starting') {
        violate('I4', `${describeState(state)} committed while a child it started is ${child.state.kind}`)
      }
    }
  }

  /** I9: a snapshot is frozen and generations never decrease. */
  const checkSnapshot = (state: LifecycleState, where: string) => {
    if (!Object.isFrozen(state)) {
      violate('I9', `${where}: snapshot ${describeState(state)} is not frozen`)
    }
    if (state.generation < lastGeneration) {
      violate('I9', `${where}: generation went from ${lastGeneration} back to ${state.generation}`)
    }
    lastGeneration = Math.max(lastGeneration, state.generation)
  }

  const subject = make(hooks, clock ? { clock, startTimeoutMs: 25, stopTimeoutMs: 25 } : undefined)
  lifecycle = subject.lifecycle
  ready = subject.condition('ready')
  for (let i = 0; i < 2; i++) {
    children.push(make({ onStart () {} }).lifecycle)
  }

  /** The live scope: the current generation's, unless it already ended. */
  const live = () => {
    const record = generations.get(lifecycle.state.generation)
    return record && !record.ended ? record.scope : undefined
  }
  const stale = (n: number) => {
    const ended = [ ...generations.values() ].filter(record => record.ended)
    return ended.length > 0 ? ended[n % ended.length]!.scope : undefined
  }

  /** A caller command or wait, with its own abort signal one time in three. */
  const call = (label: string, invoke: (signal?: AbortSignal) => Promise<unknown>, n: number, always = false) => {
    const controller = always || n % 3 === 0 ? new AbortController() : undefined
    calls.push({ label, observed: observe(invoke(controller?.signal)), controller })
  }

  const supported = opWeights(capabilities)

  const execute = (op: Op, n: number) => {
    if (!(op in supported)) {
      // A saved schedule replayed on an implementation that lacks a capability.
      return flush(TURNS)
    }
    const scope = live()
    switch (op) {
      case 'start':
      case 'stop':
      case 'restart':
        call(`${op}()`, signal => lifecycle[op](signal ? { signal } : undefined), n)
        break
      case 'abort': {
        const open = calls.filter(entry => entry.controller && !entry.controller.signal.aborted)
        open[n % Math.max(open.length, 1)]?.controller!.abort(new Error('caller abort'))
        break
      }
      case 'whenState': {
        const kind = KINDS[n % KINDS.length]!
        call(`whenState(${kind})`, signal => lifecycle.whenState(state => {
          if (!sameState(lifecycle.state, state) && !sameState(state, lifecycle.state)) {
            violate('I10', `a whenState predicate saw ${describeState(state)} while the committed state is ${describeState(lifecycle.state)}`)
          }
          return state.kind === kind
        }, { signal }), n, true)
        break
      }
      case 'wait':
        call('ready.wait()', signal => ready.wait({ signal }), n, true)
        break
      case 'resolve':
      case 'reject':
        gates[n % Math.max(gates.length, 1)]?.settle(op === 'resolve')
        break
      case 'advance':
        return clock?.advance(1 + (n % 40))
      case 'flush':
        return flush(TURNS)
      case 'fail':
        scope?.fail(new Error(`fail at step ${step}`))
        break
      case 'recover':
        if (scope) {
          calls.push({ label: 'recover()', observed: observe(Promise.resolve(scope.recover())) })
        }
        break
      case 'set':
        scope?.set(ready)
        break
      case 'clear':
        scope?.clear(ready)
        break
      case 'acquire':
      case 'use':
      case 'defer':
      case 'spawn':
        if (scope) {
          resource(scope, op)
        }
        break
      case 'child':
        if (scope) {
          const child = children[n % children.length]!
          const claim = observe(scope.start(child))
          calls.push({ label: 'scope.start(child)', observed: claim })
          claimed.add(child)
        }
        break
      case 'child-stop':
        calls.push({ label: 'child.stop()', observed: observe(children[n % children.length]!.stop()) })
        break
      case 'stale-fail': {
        const old = stale(n)
        if (old) {
          const error = new Error(`stale fail at step ${step}`)
          staleErrors.add(error)
          old.fail(error)
        }
        break
      }
      case 'stale-recover': {
        const old = stale(n)
        if (old) {
          calls.push({
            label: 'stale recover()',
            observed: observe(Promise.resolve(old.recover())),
            check: value => (value === 'superseded' ? undefined : `a stale scope's recover() returned ${String(value)}, not 'superseded'`),
          })
        }
        break
      }
      case 'stale-set': {
        const old = stale(n)
        if (old) {
          const before = capabilities.has('condition.isSet') ? ready.isSet : undefined
          if (n % 2 === 0) {
            old.set(ready)
          } else {
            old.clear(ready)
          }
          if (before !== undefined && ready.isSet !== before) {
            violate('I8', `a stale scope's ${n % 2 === 0 ? 'set' : 'clear'}() changed isSet`)
          }
        }
        break
      }
      case 'late-defer': {
        const old = stale(n)
        if (old) {
          try {
            old.defer(releaser(register(old.generation)))
          } catch {
            // A late registration throws the retirement reason (C-SCOPE-02).
          }
        }
        break
      }
    }
    return undefined
  }

  /** I3 checks, one per stop() of the schedule, run after every step. */
  const stopChecks: (() => boolean)[] = []
  const checkStops = () => {
    for (let i = stopChecks.length - 1; i >= 0; i--) {
      if (stopChecks[i]!()) {
        stopChecks.splice(i, 1)
      }
    }
  }

  /** Check I3 once `entry`, a stop() that captured `captured`, resolves. */
  const watchStop = (entry: Call, captured: number) => {
    // Late releases already running when the stop() was accepted are instance
    // obligations it waits for (C-SCOPE-11), unless a newer generation started
    // meanwhile; ones registered later are not its business.
    const lateAtAcceptance = new Set(obligations.filter(obligation => obligation.late && holds(obligation)))
    stopChecks.push(() => {
      if (entry.observed.status === 'pending') {
        return false
      }
      if (entry.observed.status === 'resolved') {
        for (const obligation of obligations) {
          if (obligation.generation <= captured && !obligation.late && holds(obligation)) {
            violate('I3', `stop() resolved while ${name(obligation)} is not released`)
          }
        }
        if (lifecycle.state.generation === captured) {
          for (const obligation of lateAtAcceptance) {
            if (holds(obligation)) {
              violate('I3.late', `stop() resolved while ${name(obligation)}, running when the stop() was accepted, is not released`)
            }
          }
        }
      }
      return true
    })
  }

  process.on('unhandledRejection', unhandled)
  try {
    for (step = 0; step < schedule.steps.length; step++) {
      const { op, n } = schedule.steps[step]!
      log?.(`step ${step}: ${op} ${n}`)
      const before = calls.length
      const captured = lifecycle.state.generation
      await execute(op, n)
      if (op === 'stop') {
        const entry = calls[before]
        if (entry) {
          watchStop(entry, captured)
        }
      }
      await flush(TURNS)
      checkStops()
      checkSnapshot(lifecycle.state, 'after a step')
      checkIdle()
    }
    step = schedule.steps.length
    log?.('drain')
    await drain()
    await new Promise(resolve => setImmediate(resolve))
    await flush()
    checkIdle()
    for (const entry of calls) {
      if (entry.observed.status === 'pending') {
        violate(entry.invariant?.() ?? 'I5', `${entry.label} never settled`)
      } else if (entry.check) {
        const problem = entry.observed.status === 'resolved'
          ? entry.check(entry.observed.value)
          : `${entry.label} rejected with ${describe(entry.observed.error)} instead of resolving`
        if (problem) {
          violate('I8', problem)
        }
      }
    }
    if (!hungForever && lifecycle.state.kind !== 'stopped') {
      violate('I11', `draining ended ${describeState(lifecycle.state)}, not stopped, although nothing hung forever`)
    }
  } finally {
    process.off('unhandledRejection', unhandled)
  }
  return violations

  /** Settle everything that can settle, then stop for good. */
  async function drain () {
    const settleAll = async () => {
      for (let guard = 0; gates.length > 0 && guard < 200; guard++) {
        gates[0]!.settle(true)
        await flush(TURNS)
        checkStops()
      }
      await clock?.advance(1_000_000)
      await flush(TURNS)
      checkStops()
    }
    for (let round = 0; round < 5; round++) {
      await settleAll()
      log?.(`  drain round ${round}: ${describeState(lifecycle.state)}, children ${children.map(child => describeState(child.state)).join(' ')}, ${gates.length} gate(s)`)
      calls.push({ label: `drain stop() ${round}`, observed: observe(lifecycle.stop()) })
      await flush(TURNS)
      checkStops()
    }
    await settleAll()
    for (const entry of calls) {
      entry.controller?.abort(new Error('drained'))
    }
    for (const child of children) {
      calls.push({ label: 'drain child.stop()', observed: observe(child.stop()) })
    }
    await flush()
    checkStops()
  }
}

/** Compare the structural fields of two snapshots. */
function sameState (a: LifecycleState, b: LifecycleState): boolean {
  return a.kind === b.kind && a.generation === b.generation &&
    (a.kind !== 'failed' || (b.kind === 'failed' && a.phase === b.phase && a.cleanupComplete === b.cleanupComplete))
}

function describeState (state: LifecycleState): string {
  return state.kind === 'failed'
    ? `failed(${state.generation}, ${state.phase}, ${state.cleanupComplete ? 'clean' : 'dirty'})`
    : `${state.kind}(${state.generation})`
}

function describe (value: unknown): string {
  return value instanceof Error ? `${value.name}: ${value.message}` : String(value)
}

/**
 * Shrink a failing schedule: drop steps one at a time, from the end, while the
 * schedule still breaks `invariant`. Returns the smallest schedule found.
 */
async function shrink (make: MakeSubject, capabilities: ReadonlySet<Capability>, schedule: Schedule, invariant: string): Promise<Schedule> {
  let current = schedule
  for (let pass = 0; pass < 3; pass++) {
    let changed = false
    for (let i = current.steps.length - 1; i >= 0; i--) {
      const candidate: Schedule = { seed: current.seed, steps: current.steps.filter((_, index) => index !== i) }
      const found = await run(make, capabilities, candidate)
      if (found.some(violation => violation.invariant === invariant)) {
        current = candidate
        changed = true
      }
    }
    if (!changed) {
      break
    }
  }
  return current
}

export type { Op, Schedule, Step, Violation }
export { generate, run, shrink }
