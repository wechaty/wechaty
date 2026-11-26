# scopelet

> Stop wrestling with boolean flags and dangling timers — **scopelet** brings structured concurrency and transactional lifecycle management to JavaScript and TypeScript services.

[![npm version](https://img.shields.io/npm/v/scopelet/next.svg)](https://www.npmjs.com/package/scopelet)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](https://github.com/wechaty/wechaty/blob/main/LICENSE)
[![Runtime](https://img.shields.io/badge/runtime-Node.js%20%7C%20Deno-brightgreen.svg)](https://nodejs.org)

```sh
npm install scopelet@next
```

```ts
import { createLifecycle, AsyncLifecycle } from 'scopelet'
```

Node.js 26 or newer, ESM only, no runtime dependencies. The package lives in the [Wechaty monorepo](https://github.com/wechaty/wechaty) at `packages/scopelet` and releases in lockstep with it. The rest of this file is its contract.

One lifecycle module for every async layer of Wechaty: `Wechaty`, `Puppet`, `PuppetService`, `PuppetServer` and `Io`. It replaces `state-switch` and hand-written `start` / `stop` / `reset` ([#2905](https://github.com/wechaty/wechaty/issues/2905)).

**Status: implemented and validated** through stage S5 of the convergence plan in [#2968](https://github.com/wechaty/wechaty/issues/2968): the kernel (S4, [#2972](https://github.com/wechaty/wechaty/issues/2972)) passes this contract under Node.js and Deno, and the `Io`, `Puppet` and `Wechaty` examples run on it (S5, [#2973](https://github.com/wechaty/wechaty/issues/2973)). It moved out of `wechaty` (where it was `wechaty/async-lifecycle`) into this package in [#3021](https://github.com/wechaty/wechaty/issues/3021) (D20, D44), so that `wechaty-puppet` can adopt it.

> **Experimental.** The API of `scopelet` may still change in a breaking way before Wechaty 2.0 is final; do not depend on it outside Wechaty yet. Its only adopters are `Io` and `IoClient` ([#3022](https://github.com/wechaty/wechaty/issues/3022)). Migrating the other layers ([#2905](https://github.com/wechaty/wechaty/issues/2905)) comes next; [`TODO.md`](https://github.com/wechaty/wechaty/blob/main/TODO.md) at the repository root records the state.

## Why Your Async Services Leak (And How to Fix Them)

Every developer building background daemons, long-lived clients, or bot frameworks in JavaScript and TypeScript eventually encounters the same subtle production failures:

- **The Zombie Callback:** An asynchronous reconnect callback fires 30 seconds after a service was "stopped", creating a dangling connection that leaks memory and corrupts data.
- **The Teardown Race:** A rapid `start() -> stop() -> start()` sequence executes concurrently, causing two generations of the service to interleave and bind to the same resources.
- **The Half-Closed Socket:** Sockets and intervals remain active during process shutdown because cleanup logic was skipped or failed partway through.
- **The Brittle Boolean Flag:** Managing `this.isStarting`, `this.isStarted`, and `this.isStopping` booleans quickly degenerates into an unmaintainable distributed state machine.

### The Solution: Structured Lifecycle Concurrency

`scopelet` solves these challenges by treating service lifecycles like database transactions with structured concurrency:

1. **Intent-Driven Reconciler:** Callers only express high-level *intent* (`start()`, `stop()`, `restart()`). A single internal reconciler engine processes commands sequentially, guaranteeing that conflicting commands never race or overlap.
2. **Generational Scoping:** Every start attempt creates a unique *generation number* and an isolated, frozen `LifecycleScope`. Callbacks from past generations hold sealed scopes and are physically prevented from mutating newer generations.
3. **Deterministic LIFO Ownership Ledger:** Resources acquired through `scope.acquire()`, `scope.use()`, or `scope.defer()` are tracked in an ownership ledger and automatically torn down in strict reverse (LIFO) order upon shutdown.
4. **Cooperative Cancellation:** Every generation provides a standard `AbortSignal` that cancels background tasks and in-flight operations gracefully during retirement.
5. **Hierarchical Supervision:** Parents can safely supervise children via `scope.start(child)`. If a child fails or ungracefully stops, the failure automatically escalates to the parent.

## Table of Contents

- [Why Your Async Services Leak (And How to Fix Them)](#why-your-async-services-leak-and-how-to-fix-them)
  - [The Solution: Structured Lifecycle Concurrency](#the-solution-structured-lifecycle-concurrency)
- [Quick Start](#quick-start)
  - [Pattern A: Inheritance (`AsyncLifecycle`)](#pattern-a-inheritance-asynclifecycle)
  - [Pattern B: Composition (`createLifecycle`)](#pattern-b-composition-createlifecycle)
- [Real-World Case Studies](#real-world-case-studies)
  - [Case Study 1: Resilient WebSocket Client (`Io`)](#case-study-1-resilient-websocket-client-io)
  - [Case Study 2: Service Provider with Conditions and In-Flight Operations (`Puppet`)](#case-study-2-service-provider-with-conditions-and-in-flight-operations-puppet)
  - [Case Study 3: Bot Supervisor with Owned Children (`Wechaty`)](#case-study-3-bot-supervisor-with-owned-children-wechaty)
- [Installation and Runtime Support](#installation-and-runtime-support)
- [1. Model in one paragraph](#1-model-in-one-paragraph)
- [2. API at a glance](#2-api-at-a-glance)
- [3. State](#3-state)
- [4. Commands](#4-commands)
- [5. Promise contracts](#5-promise-contracts)
- [6. Scope](#6-scope)
- [7. Retirement](#7-retirement)
- [8. Deadlines](#8-deadlines)
- [9. Failure and recovery](#9-failure-and-recovery)
- [10. Children](#10-children)
- [11. Conditions](#11-conditions)
- [12. Observers and diagnostics](#12-observers-and-diagnostics)
- [13. Entry points](#13-entry-points)
- [14. Errors](#14-errors)
- [15. Companions](#15-companions)
- [16. Decisions in this document](#16-decisions-in-this-document)
- [17. Not in this module](#17-not-in-this-module)
- [18. Internal components](#18-internal-components)
- [Author and Credits](#author-and-credits)
- [License](#license)

## Quick Start

### Pattern A: Inheritance (`AsyncLifecycle`)

Extend `AsyncLifecycle` when your class does not already extend another base class:

```ts
import { AsyncLifecycle, listen, type LifecycleScope } from 'scopelet'

// Helper: cancellable sleep timer
function delay (ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(signal.reason)
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer)
      reject(signal.reason)
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

export class MetricCollector extends AsyncLifecycle {

  #server?: SomeServer

  constructor () {
    super({
      name: 'MetricCollector',
      startTimeoutMs: 5_000,
      stopTimeoutMs: 5_000,
    })
  }

  protected override async onStart (scope: LifecycleScope): Promise<void> {
    // 1. Acquire resource with deterministic teardown and interrupt
    this.#server = await scope.acquire(
      async () => startServer(8080),
      async (server) => server.close(),
      { interrupt: (server) => server.terminate() },
    )

    // 2. Attach auto-cleaned event listeners
    listen(scope, this.#server, 'error', (err) => {
      scope.fail(err)
    })

    // 3. Spawn cancellable background tasks
    scope.spawn(async (signal) => {
      while (!signal.aborted) {
        await reportMetrics(signal)
        await delay(10_000, signal)
      }
    })
  }

}
```

### Pattern B: Composition (`createLifecycle`)

Use `createLifecycle` when your class extends another class (such as `EventEmitter`):

```ts
import {
  createLifecycle,
  type Lifecycle,
  type LifecycleController,
  type LifecycleScope,
  type LifecycleState,
  type LifecycleWaitOptions,
} from 'scopelet'

export class DatabaseService implements Lifecycle {

  readonly #lifecycle: LifecycleController
  #pool?: ConnectionPool

  constructor () {
    this.#lifecycle = createLifecycle({
      onStart: async (scope: LifecycleScope) => {
        this.#pool = await scope.acquire(
          async () => ConnectionPool.connect({ max: 10 }),
          async (pool) => pool.drain(),
          { interrupt: (pool) => pool.destroy() },
        )
      },
      onStop: async () => {
        this.#pool = undefined
      },
    }, {
      name: 'DatabaseService',
      startTimeoutMs: 10_000,
      stopTimeoutMs: 5_000,
    })
  }

  get pool (): ConnectionPool | undefined {
    return this.#pool
  }

  get state (): LifecycleState {
    return this.#lifecycle.state
  }

  start (options?: LifecycleWaitOptions): Promise<void> {
    return this.#lifecycle.start(options)
  }

  stop (options?: LifecycleWaitOptions): Promise<void> {
    return this.#lifecycle.stop(options)
  }

  restart (options?: LifecycleWaitOptions): Promise<void> {
    return this.#lifecycle.restart(options)
  }

  whenState (
    predicate: (state: LifecycleState) => boolean,
    options?: LifecycleWaitOptions,
  ): Promise<LifecycleState> {
    return this.#lifecycle.whenState(predicate, options)
  }

  [Symbol.asyncDispose] (): Promise<void> {
    return this.#lifecycle[Symbol.asyncDispose]()
  }

}
```

## Real-World Case Studies

### Case Study 1: Resilient WebSocket Client (`Io`)

*Adoption status: Migrated in [#3022](https://github.com/wechaty/wechaty/issues/3022).*

In `Io` (the network gateway of Wechaty), network disconnections must recover cleanly without leaking background timers or hanging ungracefully:

```ts
import { AsyncLifecycle, listen, type LifecycleScope } from 'scopelet'

interface SocketLike {
  on (event: 'close', listener: () => void): void
  off (event: 'close', listener: () => void): void
  ping (): void
  terminate (): void
  close (): Promise<void>
}

export interface IoOptions {
  readonly url: string
  readonly openSocket: (url: string, signal: AbortSignal) => Promise<SocketLike>
}

function delay (ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(signal.reason)
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer)
      reject(signal.reason)
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

function backoffMs (failures: number): number {
  return failures === 0 ? 0 : Math.min(30_000, 1_000 * 2 ** (failures - 1))
}

export class Io extends AsyncLifecycle {

  readonly #options: IoOptions
  #failures = 0

  constructor (options: IoOptions) {
    super({ name: 'Io', stopTimeoutMs: 5_000 })
    this.#options = options
  }

  protected override async onStart (scope: LifecycleScope): Promise<void> {
    const socket = await this.#connect(scope)

    // Detached automatically on retirement
    listen(scope, socket, 'close', () => {
      this.#failures++
      // Triggers generation recovery without leaking old callbacks
      scope.recover(new Error('socket closed'))
    })

    // Background keepalive ping cancelled automatically on abort
    scope.spawn(async (signal: AbortSignal) => {
      while (!signal.aborted) {
        socket.ping()
        await delay(10_000, signal)
      }
    })

    this.#failures = 0
  }

  async #connect (scope: LifecycleScope): Promise<SocketLike> {
    for (;;) {
      await delay(backoffMs(this.#failures), scope.signal)
      try {
        return await scope.acquire(
          (signal: AbortSignal) => this.#options.openSocket(this.#options.url, signal),
          (socket: SocketLike) => socket.close(),
          { interrupt: (socket: SocketLike) => socket.terminate() },
        )
      } catch (error) {
        if (scope.signal.aborted) throw error
        this.#failures++
      }
    }
  }

}
```

### Case Study 2: Service Provider with Conditions and In-Flight Operations (`Puppet`)

*Adoption status: Planned in [#3024](https://github.com/wechaty/wechaty/issues/3024).*

`Puppet` wraps provider drivers that authenticate asynchronously and send messages. It leverages the generation-bound `ready` condition, wraps in-flight calls with `operation`, and manages provider shutdown via `scope.defer()` and abort listeners:

```ts
import { EventEmitter } from 'node:events'
import {
  createLifecycle,
  listen,
  operation,
  LifecycleUnsafeStateError,
  type Lifecycle,
  type LifecycleController,
  type LifecycleScope,
  type LifecycleState,
  type LifecycleWaitOptions,
  type LifecycleCondition,
} from 'scopelet'

export abstract class Puppet extends EventEmitter implements Lifecycle {

  readonly #lifecycle: LifecycleController
  readonly #ready: LifecycleCondition
  #scope?: LifecycleScope

  constructor () {
    super()
    this.#lifecycle = createLifecycle({
      onStart: (scope: LifecycleScope) => this.#start(scope),
      onStateChange: (state: LifecycleState) => {
        if (state.kind === 'failed' && this.listenerCount('error') > 0) {
          this.emit('error', state.error)
        }
      },
    }, { name: 'Puppet', startTimeoutMs: 15_000, stopTimeoutMs: 15_000 })
    this.#ready = this.#lifecycle.condition('ready')
  }

  protected abstract onStart (): Promise<void>
  protected abstract onStop (): Promise<void>
  protected abstract messageSendText (conversationId: string, text: string, signal: AbortSignal): Promise<string>

  async #start (scope: LifecycleScope): Promise<void> {
    let stopping: Promise<void> | undefined
    const stopProvider = (): Promise<void> => (stopping ??= (async () => this.onStop())())

    // Roll back provider on failure via deferred cleanup (C-RET-03)
    scope.defer(async () => {
      try {
        await stopProvider()
      } catch (error) {
        stopping = undefined
        throw error
      }
    })

    // Early-abort handling if startup is aborted
    let started = false
    scope.signal.addEventListener('abort', () => {
      if (!started) {
        stopProvider().catch(() => {})
      }
    }, { once: true })

    listen(scope, this, 'ready', () => scope.set(this.#ready))

    await this.onStart()
    started = true
    this.#scope = scope
  }

  ready (options?: LifecycleWaitOptions): Promise<void> {
    return this.#ready.wait(options)
  }

  // Guarded in-flight operation: awaited before provider shutdown (C-COMP-03, D24)
  send (conversationId: string, text: string): Promise<string> {
    if (!this.#scope) {
      return Promise.reject(new LifecycleUnsafeStateError('Puppet not started'))
    }
    return operation(this.#scope, (signal: AbortSignal) =>
      this.messageSendText(conversationId, text, signal),
    )
  }

  // Composed Lifecycle interface members
  get state (): LifecycleState { return this.#lifecycle.state }
  start (options?: LifecycleWaitOptions): Promise<void> { return this.#lifecycle.start(options) }
  stop (options?: LifecycleWaitOptions): Promise<void> { return this.#lifecycle.stop(options) }
  restart (options?: LifecycleWaitOptions): Promise<void> { return this.#lifecycle.restart(options) }
  whenState (
    predicate: (state: LifecycleState) => boolean,
    options?: LifecycleWaitOptions,
  ): Promise<LifecycleState> { return this.#lifecycle.whenState(predicate, options) }
  [Symbol.asyncDispose] (): Promise<void> { return this.stop() }

}
```

### Case Study 3: Bot Supervisor with Owned Children (`Wechaty`)

*Adoption status: Planned in [#3023](https://github.com/wechaty/wechaty/issues/3023).*

`Wechaty` manages its underlying `Puppet` and `Io` as owned children with hierarchical supervision, delegating readiness while handling parent cancellation (§11, §13):

```ts
import { EventEmitter } from 'node:events'
import {
  createLifecycle,
  listen,
  LifecycleSupersededError,
  type Lifecycle,
  type LifecycleController,
  type LifecycleScope,
  type LifecycleState,
  type LifecycleWaitOptions,
} from 'scopelet'

export class Wechaty extends EventEmitter implements Lifecycle {

  readonly puppet: Puppet
  readonly io?: Io
  readonly #lifecycle: LifecycleController
  #readyWaits = new AbortController()

  constructor (puppet: Puppet, io?: Io) {
    super()
    this.puppet = puppet
    this.io = io
    this.#lifecycle = createLifecycle({
      onStart: (scope: LifecycleScope) => this.#start(scope),
      onStateChange: (state: LifecycleState) => {
        if (state.kind === 'failed') {
          this.#cancelReadyWaits(
            new LifecycleSupersededError('the bot failed before the puppet was ready', { cause: state.error }),
          )
        }
      },
    }, { name: 'Wechaty', stopTimeoutMs: 30_000 })
  }

  async #start (scope: LifecycleScope): Promise<void> {
    // Forward ready event
    listen(scope, this.puppet, 'ready', () => this.emit('ready'))

    // Children start in sequence and stop in LIFO reverse order (C-CHILD-04)
    await scope.start(this.puppet)
    if (this.io) {
      await scope.start(this.io)
    }
  }

  #cancelReadyWaits (reason: unknown): void {
    this.#readyWaits.abort(reason)
    this.#readyWaits = new AbortController()
  }

  // Delegated ready wait: rejects if parent stops or fails before puppet is ready (§11)
  ready (options?: LifecycleWaitOptions): Promise<void> {
    const signal = options?.signal
      ? AbortSignal.any([ options.signal, this.#readyWaits.signal ])
      : this.#readyWaits.signal
    return this.puppet.ready({ signal })
  }

  // Composed Lifecycle interface members
  get state (): LifecycleState { return this.#lifecycle.state }
  start (options?: LifecycleWaitOptions): Promise<void> { return this.#lifecycle.start(options) }
  stop (options?: LifecycleWaitOptions): Promise<void> {
    if (!options?.signal?.aborted) {
      this.#cancelReadyWaits(new LifecycleSupersededError('Wechaty stopped before puppet ready'))
    }
    return this.#lifecycle.stop(options)
  }
  restart (options?: LifecycleWaitOptions): Promise<void> { return this.#lifecycle.restart(options) }
  whenState (
    predicate: (state: LifecycleState) => boolean,
    options?: LifecycleWaitOptions,
  ): Promise<LifecycleState> { return this.#lifecycle.whenState(predicate, options) }
  [Symbol.asyncDispose] (): Promise<void> { return this.stop() }

}

// Usage with standard Symbol.asyncDispose
export async function main (bot: Wechaty): Promise<void> {
  await using activeBot = bot
  await Promise.all([ activeBot.ready(), activeBot.start() ])
  // Automatically stopped when block exits, even on unexpected throw!
}
```

## Installation and Runtime Support

```sh
npm install scopelet@next
```

### Runtime Support

- **Node.js**: Version 26 or newer (requires native ESM and modern timer and diagnostics APIs).
- **Deno**: Experimental compatibility (validated against Deno 2.x in CI).
- **Single-Realm Protection**: Within a JavaScript realm, child lifecycle ownership is guarded by a shared registry on `globalThis` under `Symbol.for('scopelet.owned-children')` (C-CHILD-02).
- **Cross-Realm Boundaries**: Cross-realm ownership (e.g. crossing Node.js `node:vm` contexts or iframes) is explicitly unsupported per C-CHILD-02.
- **Zero Dependencies**: Pure standard JavaScript and TypeScript with zero external runtime dependencies.

**How to read this contract.** Each rule has an ID such as `C-CMD-04`. Tests cite these IDs, and so does the TSDoc in `types.ts`. To change a rule, change it here, give it a decision ID in #2968 §6, and update the tests that cite it. `D…` IDs refer to the decision log in #2968.

## 1. Model in one paragraph

Callers state **intent** (`start`, `stop`, `restart`). One **reconciler** per instance moves the state toward that intent, one step at a time; nothing else commits state. Every start attempt creates a new **generation** with its own **scope**. `onStart` acquires everything through that scope, and the scope records it in an ownership **ledger**. **Retirement** releases the ledger in a fixed order, and the state says truthfully whether everything was released. A callback from an old generation holds an old, sealed scope, so it cannot touch a newer one.

## 2. API at a glance

```ts
// Tier 1: callers
interface Lifecycle extends AsyncDisposable {
  readonly state: LifecycleState
  start (options?: LifecycleWaitOptions): Promise<void>
  stop (options?: LifecycleWaitOptions): Promise<void>
  restart (options?: LifecycleWaitOptions): Promise<void>
  whenState (predicate: (state: LifecycleState) => boolean, options?: LifecycleWaitOptions): Promise<LifecycleState>
  [Symbol.asyncDispose] (): Promise<void>
}

// Tier 2: implementers
interface LifecycleHooks {
  onStart (scope: LifecycleScope): void | Promise<void>
  onStop? (stop: LifecycleStop): void | Promise<void>            // { generation, reason, signal }
  onStateChange? (state: LifecycleState, previous: LifecycleState): void
}

interface LifecycleScope {
  readonly generation: number
  readonly signal: AbortSignal
  acquire<T> (create, release: (resource: T) => unknown, options?: { interrupt? }): Promise<T>
  use<T extends AsyncDisposable | Disposable> (resource: T): T
  defer (cleanup: () => unknown): void
  spawn (task: (signal: AbortSignal) => Promise<void>): void
  start (child: Lifecycle): Promise<void>
  set (condition): void
  clear (condition): void
  fail (error: unknown): void
  recover (reason?: unknown): 'accepted' | 'superseded' | 'failed'
}

// Entry points (create-lifecycle.ts, async-lifecycle.ts)
function createLifecycle (hooks: LifecycleHooks, options?: LifecycleOptions): LifecycleController
abstract class AsyncLifecycle implements Lifecycle { /* protected onStart, onStop, onStateChange, condition */ }

// Companions (companions/, §15)
function listen (scope: LifecycleScope, target: EmitterLike | EventTargetLike, event: string, listener: (...args: any[]) => void): void
function operation<T> (scope: LifecycleScope, work: (signal: AbortSignal) => T | PromiseLike<T>): Promise<T>
function watchdog (scope: LifecycleScope, options: { timeoutMs: number, onTimeout: 'fail' | 'recover', clock?: LifecycleClock }): { feed (): void, disarm (): void }
```

`src/types.ts` has the full signatures with TSDoc. `src/examples/` shows `Io`, a `Puppet` base and `Wechaty` written against them, and each runs as a test (`src/examples/*.test.ts`) under Node.js and Deno.

## 3. State

```mermaid
stateDiagram-v2
  [*] --> stopped
  stopped --> starting: start / restart
  starting --> running: onStart resolved
  starting --> stopping: stop, restart, timeout, fail, or onStart threw
  running --> stopping: stop, restart, recover, fail
  stopping --> stopped: released, no replacement wanted
  stopping --> starting: released, replacement wanted
  stopping --> failed: failure, retirement failed, or a late release ends on a failed instance
  failed --> starting: start / restart, only if cleanupComplete
  failed --> stopping: stop, only if not cleanupComplete (retry cleanup)
  failed --> stopped: stop, if cleanupComplete
  stopped --> stopping: a late release starts (C-SCOPE-11)
  failed --> stopping: a late release starts on a clean failure (C-SCOPE-11)
  failed --> failed: late releases left by a failure's retirement end (C-SCOPE-11)
```

- **C-STATE-01** `state` is a frozen snapshot. Each transition publishes a new object; a snapshot never changes after it is published.
- **C-STATE-02** The initial state is `{ kind: 'stopped', generation: 0 }`.
- **C-STATE-03** Every start attempt allocates the next generation number, whether or not it succeeds. Generation numbers never decrease.
- **C-STATE-04** The only transitions are those in the diagram above.
- **C-STATE-05** `failed` carries `phase` (`'start'` before the generation committed `running`, `'run'` after, `'stop'` when retirement itself failed), `error` (the primary failure exactly as reported, falsy values included), `cleanupComplete`, and `cleanupError` when cleanup reported errors.
- **C-STATE-06** `failed { cleanupComplete: false }` means owned work may still be live. It blocks every new generation until a `stop()` finishes the cleanup. One exception: when all that is left after a failure's retirement is late releases still running, the engine publishes the outcome itself once they end (C-SCOPE-11).
- **C-STATE-07** `stopped` and `failed { cleanupComplete: true }` mean every obligation of every earlier generation was released. A deadline, an abort or a discarded promise never counts as released.

## 4. Commands

- **C-CMD-01** Commands accept intent synchronously, before their first `await`. If the caller's signal is already aborted on entry, the call rejects with `signal.reason` and changes nothing.
- **C-CMD-02** A caller's signal cancels only that caller's wait, never shared work or accepted intent.
- **C-CMD-03** Equivalent concurrent calls share one outcome, each with its own promise; promise identity is not guaranteed. In particular, concurrent `restart()` calls share one replacement and never create two.
- **C-CMD-04** `start()` while a generation is `running` and not retiring resolves at once and starts nothing.
- **C-CMD-05** `start()` while `starting` joins that attempt and never aborts it. This includes the replacement started by a recovery.
- **C-CMD-06** `start()` during retirement queues one replacement that starts only after the retirement completes. Two generations never overlap.
- **C-CMD-07** `stop()` supersedes every pending start, restart and recovery. Their callers reject with `LifecycleSupersededError`. A pending recovery is dropped; its `scope.recover()` already returned (C-REC-03).
- **C-CMD-08** `stop()` resolves when the generation it captured is released, even if a newer `start()` is already queued behind it.
- **C-CMD-09** `stop()` while `stopped` resolves at once. On a clean `failed` state it commits `stopped`, then resolves.
- **C-CMD-10** `stop()` on `failed { cleanupComplete: false }` retries only the obligations still unreleased. It commits `stopped` and resolves when they are all released; otherwise it stays dirty and rejects with the cleanup error. One exception: a `stop()` that joined unfinished work in which something failed reports that failure even if its retry released everything, and then commits a clean `failed { phase: 'stop' }` instead of `stopped` (C-TIME-03, D36).
- **C-CMD-11** `restart()` retires the current generation, if any, and resolves only when a new generation commits `running`. It is never a no-op while running. During `starting` it aborts that attempt, and the attempt's `start()` callers reject with `LifecycleSupersededError`; they do not join the replacement. A later `stop()` supersedes it.
- **C-CMD-12** `restart()` from `stopped` or a clean `failed` behaves like `start()`.
- **C-CMD-13** `start()` and `restart()` on `failed { cleanupComplete: false }` reject at once with `LifecycleUnsafeStateError` and change nothing. Only `stop()` can finish that cleanup (D27).
- **C-CMD-14** A failed attempt ends. Nothing retries because the intent is still "running". A new generation needs a new command or an accepted `scope.recover()`.
- **C-CMD-15** `[Symbol.asyncDispose]()` is `stop()`, and the instance can start again (D4).
- **C-CMD-16** `whenState(predicate)` resolves with the first snapshot, the current one included, for which `predicate` returns `true`; `failed` snapshots are passed to it like any other. It rejects only on caller abort, or with the error if `predicate` throws.
- **C-CMD-17** A failed start attempt rejects its callers when the failure is decided, at the first commit after it (normally `stopping`), not when its cleanup completes. A start timeout therefore reaches its callers at the deadline, even if the hook never settles. The outcome is fixed from that moment: a command accepted later, for example a `stop()` from an abort listener, does not turn it into `LifecycleSupersededError` (D35).

### Command by state

Adapted from the matrix in [#2905](https://github.com/wechaty/wechaty/issues/2905#issuecomment-6819763886). Where they differ, this table wins.

| State | `start()` | `stop()` | `restart()` |
| --- | --- | --- | --- |
| `stopped` | New generation | Resolve at once | Same as `start()` |
| `starting(G)` | Join `G`'s attempt | Abort `G`, supersede its waiters, retire `G` | Abort `G`, supersede its waiters, retire `G`, then start `G+1` |
| `running(G)` | Resolve at once | Retire `G` | Retire `G`, then start `G+1` |
| `stopping(G)`, no replacement queued | Queue `G+1` after `G` is released | Join the retirement of `G` | Queue `G+1` after `G` is released |
| `stopping(G)`, replacement queued | Join the queued `G+1` | Supersede the queued `G+1`; join the retirement of `G` | Join the queued `G+1` |
| `failed(G)`, clean | New generation | Commit `stopped`, resolve | Same as `start()` |
| `failed(G)`, dirty | Reject, `LifecycleUnsafeStateError` | Retry remaining cleanup | Reject, `LifecycleUnsafeStateError` (the #2905 matrix retried cleanup first; D27) |

## 5. Promise contracts

| Call | Resolves when | Rejects when |
| --- | --- | --- |
| `start()` | The attempt it joined commits `running` | The attempt fails (its error, as soon as the failure is decided, C-CMD-17) · a later `stop()`, or a `restart()` during `starting`, supersedes it · dirty state · caller abort |
| `stop()` | The generation it captured is released | Retirement reports errors (the cleanup error) · caller abort |
| `restart()` | The replacement commits `running` | Retirement or replacement fails · a later `stop()` supersedes it · dirty state · caller abort |
| `whenState()` | The predicate matches | Caller abort · the predicate throws |
| `condition.wait()` | The bound generation sets the condition | The bound generation retires first · `stop()` before the wait is bound · caller abort |
| `scope.acquire()` | `create` resolved while the scope is live | `create` rejects (its error) · retirement began (the retirement reason) |
| `scope.start(child)` | The child commits `running` | The child's start fails · the child is not idle and clean, or already owned · this scope is sealed · this scope's signal aborts while the child is starting (C-CHILD-03) |
| `scope.recover()` | Returns its decision synchronously and never throws (D10, D42) | Never |

## 6. Scope

- **C-SCOPE-01** Each generation has one scope, frozen. Its `generation` and `signal` belong to that generation only.
- **C-SCOPE-02** When the generation starts retiring, its scope is **sealed**. Then `use` and `defer` release their argument at once (tracked until that succeeds) and throw the retirement reason; `acquire` and `start` reject and `spawn` throws, with the retirement reason, without running anything; `set`, `clear` and `fail` do nothing; `recover` resolves `'superseded'`. The retirement reason is the generation's failure if it failed, otherwise a `LifecycleSupersededError`.
- **C-SCOPE-03** Obligations are released in the retirement order of C-RET-01.
- **C-SCOPE-04** `acquire` registers the release before `create` runs. If `create` resolves after retirement began, the resource is released and `acquire` rejects with the retirement reason at once, without waiting for that release to finish, so a hook awaiting it can return (D41). If `create` rejects, `acquire` rejects with that error and leaves no obligation behind, so a retry loop does not grow the ledger.
- **C-SCOPE-05** An `acquire` `interrupt` runs once, synchronously, in retirement step 4. For a resource still being created, it runs as soon as the resource exists, and always before that resource's release. A synchronous throw is a cleanup error. Every interrupt is called without waiting for another. A promise-like it returns is tracked like a spawned task: it is joined in step 6 under the stop deadline, its rejection is a cleanup error, and its resource is not released before it settles. Any other returned value is ignored (D38).
- **C-SCOPE-06** `use` takes `Symbol.asyncDispose` when present, otherwise `Symbol.dispose`, and throws `TypeError` for anything else.
- **C-SCOPE-07** A `spawn` task receives `scope.signal`. A rejection with `signal.reason` is its own cancellation. Any other rejection fails the generation while it is live, or becomes a cleanup error while it is retiring.
- **C-SCOPE-08** Registering the same function twice creates two obligations.
- **C-SCOPE-09** A release that fails stays owned and is retried by the next `stop()`. A release that is still running is joined, never started twice.
- **C-SCOPE-10** `defer` cleanups and `acquire` releases may return any value. A returned promise-like is awaited and its rejection is a cleanup error; any other value is ignored. A synchronous throw is a cleanup error too, handled exactly like a rejection: it never escapes as an uncaught exception, and it never stops later obligations from being released. Cleanups are therefore typed `() => unknown`, so common one-liners such as `() => emitter.off(event, listener)` type-check even though `off()` returns the emitter (D29).
- **C-SCOPE-11** A late release, one registered on a scope whose generation has already been released (C-SCOPE-02), is an obligation of the instance until it succeeds (D31). A late release that fails is cleanup **debt** of the instance:
  - While it runs, a generation that is `starting` does not commit `running` until the late release finishes; the wait counts against its start deadline (C-TIME-02). If the late release fails, that start fails with the release error and the instance ends `failed { cleanupComplete: false }`.
  - While it runs on an idle instance (`stopped`, or a clean `failed`), the state is `stopping`, and commands follow the `stopping` row of the command table: a `stop()` or `restart()` joins it as a retirement pass under its own stop deadline, which starts at acceptance (C-TIME-03), and a `start()` queues behind it (C-CMD-06). When it succeeds, the instance returns to the idle state it left: `stopped`, or the same clean `failed` (its generation, `phase` and `error`), unless a command accepted meanwhile decides otherwise. Only `stop()` turns a clean `failed` into `stopped` (C-CMD-09). When it fails, the state is `failed { cleanupComplete: false }` with the release error as `cleanupError`: from `stopped` with `phase: 'stop'` and the release error as `error`; from a clean `failed`, that failure's `phase` and `error` are kept, as the first failure wins.
  - If it fails while a generation is `running`, that generation keeps running: a live run is not taken down by an earlier generation's cleanup, and `running` makes no claim about it. Its retirement retries the debt with its own releases (C-SCOPE-09) and reports the error if the retry fails too (C-RET-06), so `stopped` and a new generation still wait until the debt is cleared. The failure produces no commit, so no observer sees it; S4 decides how diagnostics report it.
  - If it fails while a generation is retiring, that retirement reports it as a cleanup error.
  - A `stop()`, `restart()` or recovery of a live generation waits for late releases that are running, under its stop deadline; one that fails after the retirement was requested, even from the run's own abort listeners, is reported, not retried in the same pass (C-CMD-10). A failure's retirement does not wait for them: it commits `failed { cleanupComplete: false }` and, when they end, publishes the outcome itself, the same failure with `cleanupComplete: true`, or still dirty with their error as `cleanupError`. A `stop()`, `start()` or `restart()` accepted while that retirement runs makes it wait for them, so the command gets a real outcome.

## 7. Retirement

- **C-RET-01** A generation retires in this order (D9):
  1. **Seal** the scope (C-SCOPE-02).
  2. **`onStop`**, only if the generation reached `running`. It runs with its resources live and `scope.signal` not yet aborted, under the stop-deadline signal.
  3. **Abort** `scope.signal`.
  4. **Interrupt**: run every `acquire` `interrupt`, newest first, synchronously, without waiting for any (C-SCOPE-05).
  5. **Wait for `onStart`** to settle, if it is still running.
  6. **Join every spawned task**, and every promise returned by an interrupt.
  7. **Release** resources and deferred cleanups and stop children, newest first, continuing past errors.
  8. **Commit**: `stopped`, `starting` for a queued replacement, or `failed` with the truth about `cleanupComplete`.

  Tasks are joined before anything is released, because tasks use resources: a task registered before a resource may still depend on it. A task must therefore return once its signal aborts or its resource is interrupted. A task that does neither holds retirement until the stop deadline.
- **C-RET-02** `onStop` runs at most once per generation and is never retried. Its rejection is a cleanup error (D8).
- **C-RET-03** A generation that never reached `running` is rolled back by its ledger alone; `onStop` is not called (D8).
- **C-RET-04** One cleanup error is reported as itself; several are reported as an `AggregateError`.
- **C-RET-05** Concurrent `stop()` calls, and `Symbol.asyncDispose`, share one retirement pass per generation.
- **C-RET-06** A replacement starts only after the previous generation was released. If that retirement reports errors, the queued replacement does not start: its callers reject with the cleanup error, and the state is `failed { phase: 'stop' }`.
- **C-RET-07** If a generation is already retiring when its `onStart` would be called, for example after a `stop()` from the `starting` observer, `onStart` is not called. Calling it with an aborted scope would make an abort-driven hook miss the abort (D34).

## 8. Deadlines

- **C-TIME-01** `startTimeoutMs` and `stopTimeoutMs` must be finite, greater than 0 and at most 2³¹−1. Anything else throws `RangeError` when the instance is created. Omitted means no deadline (D11).
- **C-TIME-02** The start deadline runs from the commit of `starting` until the attempt can commit `running`: until `onStart` settles and every late release the generation waits for has finished (C-SCOPE-11). On expiry the attempt fails with `LifecycleTimeoutError` (`phase: 'start'`) and the generation retires. The hook stays tracked until it settles.
- **C-TIME-03** The stop deadline covers one whole retirement pass: `onStop`, waiting for `onStart`, joining tasks, and releases. It starts when the retirement is requested, that is when the command is accepted, before any abort listener runs. On expiry the state becomes `failed { phase: 'stop', cleanupComplete: false }` with a `LifecycleTimeoutError`. Unfinished work stays tracked. The next `stop()` joins it, and within its own deadline retries, once, every obligation that failed, including one that failed in the work it joined (D36). Errors from the joined work are still reported, because the `stop()` that timed out reported only the timeout: the joining `stop()` rejects with them, and the state is `failed { phase: 'stop' }`, whose `cleanupComplete` says whether the retry released everything. A caller that only wants the instance stopped calls `stop()` again. The two deadlines start at different points on purpose: the stop deadline at acceptance, so that `stop()` settles within `stopTimeoutMs` of the call even if an abort listener blocks; the start deadline at the commit of `starting` (C-TIME-02), so that a `start()` queued behind a slow retirement does not time out before its `onStart` runs.
- **C-TIME-04** All deadlines use the injected `LifecycleClock`; the default uses the global timers (D12).
- **C-TIME-05** A deadline is judged by the clock. If `clock.now()` shows that a deadline has passed when an outcome would be committed, the outcome is a timeout, even if the deadline's timer has not fired, for example because a hook blocked the thread. This holds for every outcome: an `onStart` that rejects after the start deadline passed reports `LifecycleTimeoutError`, not its own error. The timer only wakes the reconciler, and a timer that fires before the clock reaches the deadline does not expire it (D30).

## 9. Failure and recovery

- **C-REC-01** `scope.fail(error)` retires the generation with no replacement and ends `failed` (`phase: 'run'` if it reached `running`, otherwise `'start'`). The first failure wins, and its value is kept as given.
- **C-REC-02** An accepted `scope.recover(reason)` retires the running generation (`onStop` reason `'recover'`) and starts a replacement without counting as user intent: `running → stopping → starting → running`, with no `stopped` or `failed` in between.
- **C-REC-03** `scope.recover()` returns its decision synchronously and never throws (D10, D42). It returns `'accepted'` when called from the live generation while it is `running`: the generation retires and a replacement is queued. It returns `'superseded'` when called from a retiring or retired scope, and changes nothing. It returns `'failed'` when called before `running`: it then acts like `fail(reason)`, so a first boot fails fast. It does not report how the recovery ends; the lifecycle does (`state`, `whenState`). A `stop()` or `restart()` accepted before the replacement commits `running` supersedes the recovery, including a replacement still in `starting`, for example one retrying its connection under C-REC-06, which the user cancels. A `start()` accepted meanwhile does not cancel the recovery: one replacement starts, and that `start()` resolves when it commits `running` (C-CMD-05). If the retirement reports errors or the replacement fails, the instance ends `failed` as for any retirement or start, and no replacement is retried (C-REC-06).
- **C-REC-04** Recovery authority is checked again after the old generation is released, so a `stop()` or `restart()` accepted in the meantime always wins.
- **C-REC-05** A task that calls `recover()` is joined like any other task when its generation retires (C-RET-01), so it must return once `scope.signal` aborts. Since `recover()` returns at once, a task never waits on its own retirement, and the kernel needs no way to tell which task made the call (D42, replacing D19 and D22).
- **C-REC-06** The module has no retry policy: no backoff, no budget, no automatic restart (D7). Implementers write policy in their hooks. The usual pattern is to retry inside `onStart` under `scope.signal`, so the state stays `starting` while offline and `stop()` cancels the wait; see `examples/io.example.ts`. A recovery whose replacement fails ends `failed`, and an owning parent then fails too (C-CHILD-05).

## 10. Children

- **C-CHILD-01** `scope.start(child)` needs only the `Lifecycle` interface. The child must be `stopped` or cleanly `failed` and not owned by another scope. Otherwise it rejects with `LifecycleUnsafeStateError` and does not touch the child. Whether a child can be claimed is decided by its public `state` alone, which is all a child from another installed copy of the module exposes. A child whose `start()` was accepted but has not committed yet still reads `stopped`, so it can be claimed, and the claim joins that start (D33).
- **C-CHILD-02** Ownership is recorded before `child.start()` is called, and released only after this scope's `child.stop()` succeeds. Until then no other scope can own the child, including a scope from another installed copy of the module: every copy in a JS realm shares one ownership registry, kept on `globalThis` under `Symbol.for('scopelet.owned-children')` (D21). The registry is per realm: a child passed into another realm, such as a Node.js `vm` context or a same-origin frame, could be claimed by a parent in each, so cross-realm ownership is unsupported. On a frozen `globalThis` each copy keeps its own registry.
- **C-CHILD-03** `scope.start(child)` waits for the child with the parent's `scope.signal` as its caller signal. When the parent retires while the child is still starting, the wait rejects with the abort reason at retirement step 3, so the parent's `onStart` can settle (step 5). Ownership is kept, and the child is stopped in step 7. Without this, a parent waiting on a child that keeps retrying, such as an offline `Io`, would hold its own retirement until the stop deadline.
- **C-CHILD-04** Children start in the order the hook starts them, and stop in retirement step 7, newest first, together with resources.
- **C-CHILD-05** When a child commits `failed`, or commits `stopped` without the parent asking, the parent generation fails with `LifecycleChildFailureError`; its `cause` is the child's error, or `undefined` for an unrequested stop. A child that restarts or recovers itself (`stopping → starting`) is not escalated. Escalation applies only while the parent generation is live: once it is retiring, a child that stops or fails unasked is not escalated, and step 7 stops it as usual. A clean `failed` child then commits `stopped` (C-CMD-09), a dirty one has its cleanup retried (C-CMD-10), and a failure to stop it is a cleanup error of the parent (D39).
- **C-CHILD-06** When the child's start fails, `scope.start()` rejects with that error, and the module creates no unhandled rejection.
- **C-CHILD-07** If an owned child restarts itself while its parent is stopping it, so that the child is not `stopped` when the parent's stop of it settles, the parent's retirement reports a `LifecycleUnsafeStateError` cleanup error. The parent ends `failed { cleanupComplete: false }`, keeps owning the child, and its next `stop()` stops the child again (D32).

## 11. Conditions

- **C-COND-01** Conditions are declared per instance by name; the same name returns the same condition. `set` and `clear` with a condition declared on another instance throw `TypeError`.
- **C-COND-02** A wait binds to the generation that is `starting` or `running` and not retiring. Otherwise it binds to the next generation to start, so a wait created before `start()` works.
- **C-COND-03** A wait resolves when its bound generation sets the condition, or at once if it already has.
- **C-COND-04** A wait rejects with `LifecycleSupersededError` when its bound generation retires first (the generation's failure, if any, is the `cause`), or when `stop()` is accepted before the wait is bound to a generation. It rejects with the caller's abort reason on abort (D28).
- **C-COND-05** Results never cross generations. A `set` from a stale scope does nothing, and a new generation starts with every condition clear.
- **C-COND-06** `isSet` is `true` only while the current live generation has the condition set (D23).

Usage notes, not rules:

- A wait created before `start()` rejects if that start fails, so give it a handler at once, for example `await Promise.all([ bot.ready(), bot.start() ])`. Awaiting `start()` first leaves the wait unhandled when `start()` throws.
- To expose a child's condition, delegate to the child (`ready () { return this.puppet.ready() }`) rather than mirroring it into a condition of your own. A mirror would also have to be cleared whenever the child's generation retires, which no child event reports.
- A delegated wait is bound to the child, so on its own it does not reject when the parent stops or fails before it ever owned the child. Pass the child a signal that the parent aborts when it accepts `stop()` or fails, as `src/examples/wechaty.example.ts` does.

## 12. Observers and diagnostics

- **C-OBS-01** Each commit runs in this order: freeze the snapshot; settle the outcomes of attempts, stops and condition waits; resolve `whenState` waiters; publish diagnostics; call `onStateChange`.
- **C-OBS-02** A throwing `onStateChange` or diagnostics subscriber is isolated and never changes an outcome. A throwing `whenState` predicate rejects only its own wait.
- **C-OBS-03** Observers may call commands. There is only ever one reconciler per instance, and a command from an observer is accepted like any other.
- **C-OBS-04** After each commit, and only when the channel has subscribers, a `LifecycleDiagnosticRecord` is published on the `node:diagnostics_channel` channel `scopelet.state` (D23). The module looks the channel module up at runtime with `process.getBuiltinModule`; where the runtime has none, as in a browser, nothing is published (D43). A record holds the `name` option and the structural fields of the previous and current snapshots (`kind`, `generation`, and for `failed`, `phase` and `cleanupComplete`). It never holds errors or application data.

## 13. Entry points

- **C-SHELL-01** `createLifecycle(hooks, options)` and `abstract class AsyncLifecycle` share one engine and behave identically; the entry points add no behavior.
- **C-SHELL-02** The caller-API members of `AsyncLifecycle` (`state`, `start`, `stop`, `restart`, `whenState`, `Symbol.asyncDispose`) cannot be overridden; either kind of override fails `new`. An override declared as a **method** on a subclass is detected by the base constructor, which throws `LifecycleOverrideError`. An override declared as a **class field** is defined only after the base constructor returns, so the base cannot detect it. Instead, the base constructor installs these members as own, non-writable, non-configurable properties: defining the field then throws a native `TypeError`, and assigning to one fails.
- **C-SHELL-03** `createLifecycle` throws `TypeError` when `hooks.onStart` is not a function, or `onStop` / `onStateChange` is present but not a function.
- **C-SHELL-04** The `name` option is a diagnostics label. It is published (C-OBS-04), so it must not contain secrets.

Choosing an entry point: use `AsyncLifecycle` for a class with no other base (`Io`). Use `createLifecycle` for a class that keeps its base, such as an EventEmitter (`Puppet`, `Wechaty`), or whose subclasses already own the names `onStart` / `onStop` (Puppet providers).

## 14. Errors

Branch on `code`, or use `isLifecycleError(value, code?)`. Don't rely on `instanceof`: with two installed copies of the module, an error from one copy is not an instance of the other copy's classes (D13).

| Class | `code` | When |
| --- | --- | --- |
| `LifecycleError` | (base) | Base of all of the below |
| `LifecycleSupersededError` | `ERR_LIFECYCLE_SUPERSEDED` | A newer command won (C-CMD-07, C-COND-04), or the retirement reason of a sealed scope |
| `LifecycleTimeoutError` | `ERR_LIFECYCLE_TIMEOUT` | A start or stop deadline expired, or a `watchdog` was not fed in time; has `phase` (`'start'`, `'stop'` or `'watchdog'`) and `timeoutMs` |
| `LifecycleUnsafeStateError` | `ERR_LIFECYCLE_UNSAFE_STATE` | A command refused on a dirty state, or an unusable child (C-CMD-13, C-CHILD-01) |
| `LifecycleChildFailureError` | `ERR_LIFECYCLE_CHILD_FAILURE` | An owned child failed or stopped unasked; `cause` is its error (C-CHILD-05) |
| `LifecycleOverrideError` | `ERR_LIFECYCLE_OVERRIDE` | A subclass method overrode a caller-API member; has `member`. A class-field override fails with a native `TypeError` instead (C-SHELL-02). |

The module also passes through, without wrapping: hook errors as reported (falsy values included), `AggregateError` for several cleanup errors (C-RET-04), `RangeError` for invalid options (C-TIME-01), and `TypeError` for misuse (C-SCOPE-06, C-COND-01, C-SHELL-02 for class-field overrides, C-SHELL-03).

## 15. Companions

Helpers built only on the public scope; they need nothing private (D17). Their signatures landed with their implementation in S4 (D26). They import no `node:` module, so they also run in the browser.

- **C-COMP-01** `listen(scope, target, event, listener)` adds `listener` to an EventEmitter-like target (`on`, with `off` or `removeListener`) or an `EventTarget`, and registers its removal on the scope before adding it. Retirement removes it, so re-adding it on every start never accumulates duplicates. On a sealed scope it adds nothing and throws the retirement reason (C-SCOPE-02). The target holds a wrapper made for that registration, which keeps the target's `this` and every argument; only that registration's removal detaches it, so a stale registration never removes the same handler a newer generation added. A target with both APIs (a `ws` WebSocket, say) is used as an `EventTarget`, so its listener gets one event object, not the emitter's arguments. An EventEmitter-like target with neither `off` nor `removeListener` is refused with `TypeError`. It replaces the repeated `on` plus `defer(off)` pairs.
- **C-COMP-02** `watchdog(scope, { timeoutMs, onTimeout, clock? })` arms a timer for the generation and returns `{ feed, disarm }`. Unless fed within `timeoutMs`, it calls `scope.fail(error)` (`onTimeout: 'fail'`) or `scope.recover(error)` (`'recover'`) once, with a `LifecycleTimeoutError` whose `phase` is `'watchdog'`. `feed()` restarts the countdown; `disarm()` stops it until the next `feed()`. Once it fired or its generation began retiring, nothing arms it again, and the generation's retirement clears its timer. `timeoutMs` is required and follows C-TIME-01 (`RangeError` otherwise). `onTimeout` is required; any other value is refused with `TypeError`. On a sealed scope it arms nothing and throws the retirement reason. `clock` defaults to the global timers, because the scope does not expose the lifecycle's clock.
- **C-COMP-03** `operation(scope, work)` runs `work(signal)` as an operation of the generation and returns its result (D24). It runs as a spawned task, so `stop()`, `restart()` and a recovery wait for it: retirement joins it with the tasks, before any resource is released, under the stop deadline. `signal` is `scope.signal`, which aborts when the generation starts retiring; an operation that should finish anyway may ignore it. Its result and its error, a synchronous throw included, go only to its caller: a failed operation never fails the generation. On a sealed scope it rejects at once with the retirement reason and does not call `work`. The owner keeps the scope from `onStart` and runs its public operations, such as `messageSend`, through it.

## 16. Decisions in this document

The full log, with sources and history, is #2968 §6. This file follows these:

| ID | Decision |
| --- | --- |
| D1 | One engine, two entry points; no mixin |
| D2 | Caller API: `state`, `start`, `stop`, `restart`, `whenState`, `Symbol.asyncDispose` |
| D3 | `state` is a frozen five-kind union with cleanup truth |
| D4 | `Symbol.asyncDispose` equals `stop()`; the instance is reusable |
| D5 | Readiness is named conditions; there is no `ready()` in the module |
| D6 | `acquire` records ownership before `create`; no `adopt` |
| D7 | Mechanism in the kernel, retry policy outside |
| D8 | `onStop` only for a run that reached `running` |
| D9 | Retirement order of C-RET-01: tasks are joined before anything is released |
| D10 | `scope.recover()` never throws or rejects; its result is amended by D42 |
| D11 | Timeouts: finite, > 0, ≤ 2³¹−1, else `RangeError` |
| D12 | `LifecycleClock` is `{ now, setTimeout, clearTimeout }` |
| D13 | Errors share `LifecycleError` with a stable `ERR_LIFECYCLE_*` `code`; `isLifecycleError()` checks by shape |
| D17 | `listen` and `watchdog` are companions, not scope members |
| D18 | `onStop` receives `{ generation, reason, signal }` |
| D20 | Zero-dependency; moved into a standalone package, `scopelet`, before `wechaty-puppet` adopts it (D44) |
| D21 | Child ownership is one registry per JS realm, shared by every installed copy of the module (C-CHILD-02) |
| D23 | `condition.isSet` exists; options type is `LifecycleWaitOptions`; the diagnostics channel name is amended by D44 |
| D24 | In-flight operations use the `operation` companion (C-COMP-03); the `reset()` / `state.active()` shims and the legacy `'start'` / `'stop'` / `'error'` events live in the integration layer, not the module |
| D25 | `scope.start(child)` returns `Promise<void>` and takes a child, not a factory |
| D26 | Companion signatures land with their implementation (S4), not in S1: §15, C-COMP-01 to C-COMP-03 |
| D27 | `restart()` on a dirty `failed` rejects at once, as `start()` does; only `stop()` finishes cleanup |
| D28 | A condition wait whose generation retires rejects with `LifecycleSupersededError`, with the failure as `cause` |
| D29 | `defer` cleanups and `acquire` releases are typed to return `unknown`; promise-likes are awaited, other values ignored |
| D30 | A deadline is judged by the clock when an outcome would be committed (C-TIME-05) |
| D31 | A late release is an obligation of the instance: new generations wait for it, an idle instance shows `stopping` and then returns to the idle state it left, a failure leaves cleanup debt that a running generation carries until its retirement retries it (C-SCOPE-11) |
| D32 | A child that restarts itself during its parent's stop leaves the parent with cleanup debt; the parent keeps it (C-CHILD-07) |
| D33 | A child can be claimed based on its public state alone (C-CHILD-01) |
| D34 | `onStart` is not called for a generation that is already retiring (C-RET-07) |
| D35 | A failed start rejects when the failure is decided, not after cleanup (C-CMD-17) |
| D36 | A `stop()` joining unfinished work retries, once, what failed in it, within its own deadline (C-TIME-03) |
| D37 | A `start()` during a recovery joins its replacement; only `stop()` and `restart()` supersede a recovery (C-REC-03) |
| D38 | Interrupts are all called at once; a promise one returns is joined like a task, and its rejection is a cleanup error (C-SCOPE-05) |
| D39 | A child that stops or fails unasked while its parent is retiring is not escalated; the parent stops it as usual (C-CHILD-05) |
| D41 | A late acquisition's `acquire()` rejects at once, without waiting for its release (C-SCOPE-04) |
| D42 | `scope.recover()` returns its decision synchronously, `'accepted' \| 'superseded' \| 'failed'`; the replacement's outcome is read from the lifecycle. A task requesting recovery cannot deadlock, without async context, on every runtime (C-REC-03, C-REC-05; replaces D19 and D22) |
| D43 | `node:diagnostics_channel` is looked up at runtime with `process.getBuiltinModule`; without it, as in a browser, diagnostics are a no-op (C-OBS-04) |
| D44 | The package is `scopelet`, in `packages/scopelet`, in lockstep with the other Wechaty packages. Its runtime identifiers follow the name: the diagnostics channel is `scopelet.state` and the child-ownership key is `Symbol.for('scopelet.owned-children')`. API names and `ERR_LIFECYCLE_*` codes are unchanged (#3021) |

## 17. Not in this module

- **Retry, backoff, budgets and supervision policy** (D7). Write them in hooks, or later as companions.
- **Legacy compatibility:** today's `reset()`, `state.active()` / `state.inactive()` and the `'start'` / `'stop'` / `'error'` events. They live in the integration layer (D24); `src/examples/wechaty.example.ts` shows the mapping and its test pins it. An in-flight operation such as `messageSend` during `stop()` uses the `operation` companion (C-COMP-03).
- **Proof that a remote peer stopped.** Cancelling a gRPC call does not prove the server released anything; PuppetService needs its own session protocol.

## 18. Internal components

The kernel follows the [v1 design §5](https://github.com/wechaty/wechaty/issues/2911#issuecomment-6873515089). It started from Claude's comparison implementation (D40) and is changed in S4 (#2972) only through the contract suite. These boundaries are part of the design: keep them when changing the code. Files are relative to `src/`.

| Component | File | Owns |
| --- | --- | --- |
| Types | `types.ts` | The public contract. No runtime code |
| Errors | `errors.ts` | `LifecycleError` and its subclasses, their `code`s, `isLifecycleError` |
| Engine | `engine.ts` | Intent and attempts, caller waits, generation allocation, the single reconciler, retirement and its deadlines, cleanup debt, late releases (C-SCOPE-11), and the commit that publishes a snapshot. Every rule of §3 to §12 is enforced here |
| Generation scope | `generation.ts` | One run: its `AbortController`, its ledger, its seal, and the scope object its hooks receive. It never commits state or settles a caller; it asks the engine through a narrow host interface. It also holds the realm's child-ownership registry (C-CHILD-02, D21) |
| Ledger | `ledger.ts` | A generation's obligations with per-entry status: task joins (interrupt promises included, D38) before everything else, then releases newest first, a failed entry retried, a running one joined. It knows nothing about state |
| Conditions | `condition.ts` | Declared conditions, waits bound to a generation, and each live generation's set flags |
| Clock | `clock.ts` | The default `LifecycleClock` (global timers, and `performance.now()`), and the deadline-length check the engine and the watchdog share (C-TIME-01) |
| Diagnostics | `diagnostics.ts` | Publishing on `scopelet.state`, after commit and only when subscribed, with the channel module looked up at runtime (D43) |
| Entry points | `create-lifecycle.ts`, `async-lifecycle.ts` | Delegation to the engine; the class adds only the override guard (C-SHELL-02) |
| Companions | `companions/` | `listen`, `operation` and `watchdog` (§15), built only on the public scope |
| Module | `mod.ts` | Public exports |

Rules the engine keeps, from its own header:

- **Commands only record intent.** `start`, `stop`, `restart`, `fail` and `recover` change intent synchronously. They never commit state and never run hooks.
- **One writer.** Only the reconciler commits snapshots, one step at a time, so a reentrant command only changes what the next step is.
- **Attempts drive starting.** A generation starts only for a pending attempt; a failed attempt ends, and nothing retries it.
- **One retirement path.** Stop, restart, recover, failure and cleanup retry all go through the same retirement, which settles caller waits before observers see the new snapshot.
- **Cleanup truth.** Completion is read back from the ledgers and the hook promises, never inferred from "no error" or from a deadline.
- **Deadlines are judged by the clock.** A deadline's timer only wakes the reconciler; every commit of an outcome a deadline bounds first checks `clock.now()` against it (C-TIME-05, D30).

## Author and Credits

- **Huan Li** ([@huan](https://github.com/huan)), Wechaty Project Author.
- Based on the Wechaty AsyncLifecycle architecture and structured concurrency convergence plan ([#2968](https://github.com/wechaty/wechaty/issues/2968)).

## License

Apache-2.0
