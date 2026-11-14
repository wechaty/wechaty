# `async-lifecycle`

One reusable abstraction for **asynchronous lifecycle** — the `start` /
`running` / `stop` machinery that Wechaty, Puppet, Puppet providers,
PuppetService and IO all need — built once, correctly, and shared.

This module is the reference implementation of the design converged in
[wechaty/wechaty#2911] (the public / protected / private API design) on top of
the semantics discussed in [wechaty/wechaty#2905] (the lifecycle contract).

[wechaty/wechaty#2911]: https://github.com/wechaty/wechaty/issues/2911
[wechaty/wechaty#2905]: https://github.com/wechaty/wechaty/issues/2905

---

## Why

Every long-lived Wechaty component re-implements the same error-prone dance:
guard against double-start, abort a start that is already in flight, release
resources in the right order, decide what a *second* `stop()` after a failed
cleanup should do, tell "I asked to stop" apart from "it crashed", and make
`await bot.ready()` mean "ready *for this run*" rather than "ready, once, ever".

Getting that wrong leaks connections, double-fires handlers, or deadlocks.
This module centralises the hard parts behind a small, well-specified surface so
each component only writes its own `onStart` / `onStop`.

## Design in one minute

* **Desired-state reconciliation.** Callers express *intent* (`start`, `stop`,
  `restart`). A single internal reconciler drives the observable state toward
  that intent. Intent is accepted **synchronously**, before the first `await`,
  so ordering between concurrent commands is deterministic.
* **Generations.** Every start attempt — successful or not — gets a
  monotonically increasing `generation` number. A late completion from an old
  generation is recognised and discarded (fencing).
* **Two primitives, not one.** `start`/`stop`/`restart` are *attempt results*:
  they reject on failure or supersession. `whenState` / `condition.wait()` are
  *condition observations*: they span generations and reject only on caller
  abort (or a throwing predicate). See [#2905 §10 Q7].
* **A failed attempt ends.** The kernel never silently retries just because you
  still want it running. Only a new command or an accepted `recover()` starts
  another generation.
* **Structured concurrency.** Resources, background tasks and child lifecycles
  register into one ledger and release in **reverse (LIFO)** order, mirroring
  `AsyncDisposableStack`.

[#2905 §10 Q7]: https://github.com/wechaty/wechaty/issues/2905

## The three tiers

| Tier | Who | Surface |
| ---- | --- | ------- |
| 1 — caller | anyone holding the service | `state`, `start`, `stop`, `restart`, `whenState`, `await using` |
| 2 — implementer | the component author | `onStart`, `onStop`, `onStateChange`, the per-generation `scope`, `condition`, `recover` |
| 3 — kernel | this module | private; never exported |

Two ergonomic entry points sit over the **same** private kernel:

* `createLifecycle(hooks, options)` — **composition**: a class *holds* a
  lifecycle (use this when your class already extends something, as Wechaty and
  Puppet extend an event emitter).
* `class … extends AsyncLifecycle` — **inheritance**: a class *is* a lifecycle.

---

## Quick start

### Composition — `createLifecycle`

```ts
import { createLifecycle } from 'wechaty/src/async-lifecycle/mod.ts'

class MyService {

  // Keep the controller private; expose only what you choose.
  readonly #lifecycle = createLifecycle(
    {
      onStart: async scope => {
        const conn = await connect()
        scope.defer(() => conn.close())       // released on stop, LIFO
        scope.set(this.#ready)                 // mark this generation ready
      },
      onStop: async () => {
        // Optional ordered goodbye while resources are still live.
      },
    },
    { name: 'my-service', startTimeoutMs: 10_000 },
  )

  readonly #ready = this.#lifecycle.condition('ready')

  // Delegate the Tier-1 caller API.
  get state () { return this.#lifecycle.state }
  start () { return this.#lifecycle.start() }
  stop () { return this.#lifecycle.stop() }
  ready () { return this.#ready.wait() }
}

const svc = new MyService()
const whenReady = svc.ready()   // bind BEFORE start (see "Conditions")
await svc.start()
await whenReady
await svc.stop()
```

### Inheritance — `AsyncLifecycle`

```ts
import { AsyncLifecycle } from 'wechaty/src/async-lifecycle/mod.ts'
import type { LifecycleScope } from 'wechaty/src/async-lifecycle/mod.ts'

class PuppetServer extends AsyncLifecycle {

  constructor () { super({ name: 'puppet-server' }) }

  protected override async onStart (scope: LifecycleScope): Promise<void> {
    const server = await listen()
    scope.defer(() => server.close())
  }

  protected override async onStop (): Promise<void> {
    // optional
  }
}

await using server = new PuppetServer()   // auto-stop at scope exit
await server.start()
```

A subclass **must not** override `start` / `stop` / `restart` / `whenState`;
doing so throws at construction time. Implement `onStart` / `onStop` instead.

---

## Caller API (Tier 1)

### `state: LifecycleState`

A **frozen** discriminated-union snapshot. Only the kernel can change it.

```ts
type LifecycleState =
  | { kind: 'stopped';  generation: number }
  | { kind: 'starting'; generation: number }
  | { kind: 'running';  generation: number }
  | { kind: 'stopping'; generation: number }
  | { kind: 'failed'
      generation: number
      phase: 'start' | 'run' | 'stop'
      error: unknown
      cleanupComplete: boolean
      cleanupError?: unknown
    }
```

`failed` never means "safely stopped". `cleanupComplete: false` ("dirty") means
owned resources may still be live; it blocks a new generation until a `stop()`
finishes the remaining cleanup.

The `phase` on `failed` distinguishes:

* `'start'` — `onStart` threw, was aborted, or timed out.
* `'run'`   — a running generation reported `scope.fail()` (watchdog, dropped
  connection, unrequested child exit). This extends the original
  `'start' | 'stop'` proposal so a runtime failure is distinguishable.
* `'stop'`  — cleanup (the stop hook or the ledger unwind) failed.

### `start(options?)` / `stop(options?)` / `restart(options?)`

* **`start`** resolves when *this request's* attempt is genuinely running.
  Rejects with `LifecycleSupersededError` if a newer intent replaces it, with the
  start error if `onStart` fails, or with the caller's abort reason. Concurrent
  equivalent `start()`s **share one attempt** (one `onStart` call). A `start()`
  while already running is a **no-op** — no gratuitous restart.
* **`stop`** resolves when owned resources are released; rejects on cleanup
  failure. On a dirty `failed` state it retries the remaining cleanup.
* **`restart`** retires the current run, then starts its replacement. A later
  `stop()` supersedes it permanently. From a clean `stopped` state it behaves as
  `start()`.

All three accept `{ signal }`. The signal cancels **this caller's wait only** —
it never cancels shared work and never revokes accepted intent. Aborting your
`await bot.start()` does not stop the bot for everyone else. An
already-aborted signal rejects *before* any intent is accepted.

### `whenState(predicate, options?)`

Resolves with the first snapshot for which `predicate` returns `true`
(immediately if the current snapshot already matches). Rejects only on caller
abort or if `predicate` throws — never because the service entered `failed`.

```ts
await lifecycle.whenState(s => s.kind === 'running')
```

### `await using`

A lifecycle is an `AsyncDisposable`; `Symbol.asyncDispose` calls `stop()`.

---

## Implementer API (Tier 2)

### Hooks

```ts
interface LifecycleHooks {
  onStart (scope: LifecycleScope): Promise<void> | void
  onStop? (scope: LifecycleScope): Promise<void> | void
  onStateChange? (state: LifecycleState, previous: LifecycleState): void
}
```

* **`onStart`** acquires everything the run needs. *Returning* means "running";
  *throwing* fails the attempt and unwinds the scope.
* **`onStop`** is an optional ordered goodbye **while resources are still
  usable**. It runs whenever `onStart` was entered, so it must tolerate a
  partial start.
* **`onStateChange`** runs *after* the snapshot is committed and attempt waiters
  are settled. Exceptions are isolated and never affect reconciliation.

### `scope` — the per-generation handle

The only way an implementer touches the machinery. `use` / `adopt` / `defer`
mirror `AsyncDisposableStack` names and semantics (reverse-order release).

| Member | Purpose |
| ------ | ------- |
| `signal` | `AbortSignal`, aborted when this generation retires (the "interrupt" step, before the ledger unwinds). |
| `use(resource)` | Register something that already implements `Symbol.dispose` / `Symbol.asyncDispose`. |
| `adopt(resource, release)` | Register a resource with an explicit release fn. A late acquisition during retirement is released immediately. |
| `defer(cleanup)` | Register a cleanup action (remove a listener, clear a timer). |
| `spawn(task)` | Start an owned background task, joined on retirement. A non-abort rejection calls `scope.fail`. |
| `start(child)` | Start, own, and watch a child lifecycle (works with either entry point). A child that fails or leaves `running` unasked fails the parent. |
| `set` / `clear` | Set or clear a generation-bound condition. |
| `fail(error)` | Report that this generation can no longer run → `failed { phase: 'run' }` and retirement. |

`scope` has no `close` / `abort` / `move`: **only the kernel retires a
generation.** `set` / `clear` / `fail` from a retired generation are no-ops by
construction, which fences stale callbacks.

### Conditions — generation-bound "await ready"

`controller.condition(name)` (or `this.condition(name)` in a subclass) declares a
named condition once. A caller waits with `condition.wait()`; the generation
sets it with `scope.set(condition)`.

A condition is **edge-triggered and generation-bound**:

* `wait()` binds to the generation that is currently `starting` / `running`, or
  else to the *next* generation to start — so this works:

  ```ts
  const p = bot.ready()   // bind to the next generation
  await bot.start()       // that generation sets `ready` during onStart
  await p
  ```

* A resolution **never crosses generations**: a second start does not inherit the
  first run's readiness. If the bound generation fails or retires before setting
  the condition, `wait()` rejects with `LifecycleSupersededError`.

> Because it is edge-triggered, a waiter registered *after* `scope.set()` has
> already fired for a generation will **not** retroactively resolve for that
> generation — bind the wait before (or during) the start you care about.

### `recover(observed)` — authority-checked recovery

For a supervisor that wants to bring a failed service back without pretending to
be a user command:

```ts
const snapshot = lifecycle.state
if (snapshot.kind === 'failed') {
  const result = await lifecycle.recover(snapshot)   // 'recovered' | 'superseded'
}
```

`recover` is accepted only if `observed` is still the authoritative snapshot and
no user command arrived since it was taken. It never counts as user intent, and
the authority check is repeated after the old generation retires, so a user
`start()`/`stop()` racing with a recovery always wins. A recovery against a stale
snapshot returns `'superseded'`.

---

## Timeouts

`LifecycleOptions` accepts `startTimeoutMs` and `stopTimeoutMs`:

* A start timeout fails the attempt with `LifecycleTimeoutError`, aborts the
  scope signal, and unwinds.
* A stop timeout yields `failed { phase: 'stop', cleanupComplete: false }`.

---

## Diagnostics

Observability uses `node:diagnostics_channel` — never control flow. A single
channel carries every state-commit record; subscribers filter by the record's
`state.kind`. It is **zero-cost when nobody is listening** and a throwing
subscriber can never change a lifecycle outcome.

```ts
import diagnosticsChannel from 'node:diagnostics_channel'
import { LIFECYCLE_DIAGNOSTICS_CHANNEL } from 'wechaty/src/async-lifecycle/mod.ts'
import type { LifecycleDiagnosticRecord } from 'wechaty/src/async-lifecycle/mod.ts'

diagnosticsChannel.subscribe(LIFECYCLE_DIAGNOSTICS_CHANNEL, message => {
  const record = message as LifecycleDiagnosticRecord
  console.log(record.name, record.previous.kind, '→', record.state.kind)
})
```

The channel name is `wechaty.async-lifecycle`. Records are published *after* the
snapshot is committed. Deno implements `node:diagnostics_channel`, so this works
cross-runtime.

---

## Errors

| Error | When |
| ----- | ---- |
| `LifecycleSupersededError` | an attempt was replaced by a newer intent, or a condition's generation retired before setting it |
| `LifecycleTimeoutError` | a `startTimeoutMs` / `stopTimeoutMs` deadline expired |
| `LifecycleUnsafeStateError` | an operation (e.g. `scope.start(child)`) was attempted against a state that is not safe for it |

---

## File layout

| File | Responsibility |
| ---- | -------------- |
| `mod.ts` | public barrel export |
| `types.ts` | Tier-1/Tier-2 contracts (types only) |
| `state.ts` | the frozen `LifecycleState` union |
| `errors.ts` | the three error classes |
| `create.ts` | `createLifecycle` (composition entry point) |
| `async-lifecycle.ts` | `AsyncLifecycle` (inheritance entry point) |
| `controller.ts` | the private kernel (reconciler, generations, scope) |
| `resource-ledger.ts` | the reverse-order (LIFO) disposal ledger |
| `diagnostics.ts` | `node:diagnostics_channel` integration |
| `async-lifecycle.test.ts` | the shared `node:test` suite |

## Tests

The suite is written with `node:test` + `node:assert/strict` and runs under both
Node.js and Deno. It covers the happy path, every inverted §3.8 case from
[#2905] (no gratuitous restart, abort isolation, stop-supersedes-start, no
auto-retry after failure, dirty-failure persistence, reverse-order cleanup),
conditions, `whenState`, `scope.fail` / `spawn` / child lifecycles, timeouts,
`recover`, and the `AsyncLifecycle` inheritance guard.

```sh
npm run test:unit        # repo-wide unit suite (includes this module)
```
