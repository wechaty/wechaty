# Async Lifecycle

`src/async-lifecycle/` provides a reusable async lifecycle kernel with two adoption styles:

- `createLifecycle(hooks, options)` for composition (classes that already extend another base).
- `AsyncLifecycle` for inheritance (classes that can directly extend the lifecycle base).

Both styles share one reconciliation engine and expose the same caller API:

- `state` (immutable snapshot)
- `start(options?)`
- `stop(options?)`
- `restart(options?)`
- `whenState(predicate, options?)`
- `[Symbol.asyncDispose]()` (delegates to `stop()`)

## Design Boundaries

This module owns lifecycle orchestration only:

- desired-state reconciliation
- generation fencing
- resource/task/child ownership through per-generation `LifecycleScope`
- attempt supersession behavior
- condition waits (`condition(name).wait()`)

This module intentionally does not own:

- domain events
- login/ready semantics (those are built via named conditions)
- retry budgets/backoff policy
- app-specific watchdog policy

## Implementer API

Hooks:

- `onStart(scope)` (required)
- `onStop(scope)` (optional graceful retirement hook)
- `onStateChange(state, previous)` (optional post-commit observer)

`LifecycleScope` surface:

- `signal`
- `use(resource)`
- `adopt(resource, release)`
- `defer(cleanup)`
- `spawn(task)`
- `start(child)`
- `set(condition)` / `clear(condition)`
- `fail(error)`

## Retirement

An ordinary stop or restart seals the scope, then runs the optional
`onStop` hook with resources still live. Canceling startup or reporting a
failure interrupts the scope first. Retirement waits for an entered
`onStart` to settle before invoking `onStop`.

Abort listeners should interrupt blocking I/O so tasks can finish while their
resources are still live. Retirement joins spawned tasks after abort and then
releases resources and children in reverse registration order. Disposers may
be retried after an unsuccessful release. Registrations made after sealing
release immediately and throw the retirement reason. A release registered
before retirement commits shares the same shutdown deadline. A stop or
restart waits for its outcome, including when the original disposal pass
has already finished. A failed late release stays owned, including when it
comes from a detached generation. Registering
the same callback twice creates two release obligations. A start waiting for
older cleanup joins the current generation if it is still running afterward.
If the current generation fails, its failure snapshot keeps the primary error
while older releases settle. If an older scope registers a release during a
new startup, the new generation waits for that release within its start
deadline before publishing `running`. A failed detached release interrupts
the replacement hook even if it is still waiting for its signal. A restart
waiting on that release rejects with its cleanup error. When the active
retirement and a detached release both fail, the failed snapshot retains
both cleanup errors.

For the socket example in [RFC §9](https://github.com/wechaty/wechaty/issues/2911),
initiate socket closure on abort so the task can observe the close event
before retirement joins it. The final disposer also covers a socket acquired
before its task gets to run.

```ts
import { once } from 'node:events'
import { Socket } from 'node:net'

function onStart(scope: LifecycleScope) {
  const socket = scope.adopt(new Socket(), socket => { socket.destroy() })
  scope.spawn(async signal => {
    const close = () => { socket.destroy() }
    signal.addEventListener('abort', close, { once: true })
    try {
      const closed = once(socket, 'close')
      socket.connect(9000, 'localhost')
      await closed
    } finally {
      signal.removeEventListener('abort', close)
    }
  })
}
```

Stopping an active generation can interrupt the worker's wait for older
releases. Those releases remain owned and share the stop deadline with the
active generation.

A scope may claim a stopped child or one whose failure has been fully cleaned
up. For children created with either lifecycle entry point, a pending command
or detached cleanup prevents the claim even before the public state changes.
For other implementations of `Lifecycle`, the scope can check only the public
state and existing scope ownership. If an owned child queues a replacement
while stopping, the parent retains ownership for a later stop.

The startup budget begins before the starting observer and hook run. A
synchronous hook can delay delivery of a timeout until it yields, and the
kernel checks elapsed time before publishing success. Retirement likewise
checks the shared stop deadline before committing success, including after
it has joined late releases. A restart that must retire work starts that
budget when accepted, before abort listeners or the retirement worker run.
Concurrent stop callers share the retirement outcome through the final
commit, even after the last detached release has settled.

An expired deadline rejects the operation and records unresolved cleanup in
`failed`. A later `stop()` can join the existing retirement and retry
unfinished releases. When startup times out, the original caller receives
the start timeout. A synchronous abort listener can call `stop()`, `start()`,
or `restart()`. Each command waits for retirement under the stop deadline.
A replacement starts only after owned work has settled and resources have
been released.
Hooks can request another lifecycle operation synchronously. A hook must
return before awaiting a command that depends on that hook settling.

## Conditions

`condition(name)` returns an instance-owned, generation-bound condition.
A wait binds to the open generation or the next generation if the instance
is idle or retiring. Setting the condition resolves waits for that generation.
Retirement rejects unsatisfied waits for the retiring generation. An accepted
stop supersedes existing waits for the next generation, including waits
registered before the first start. A wait registered after that stop can
observe the next start. Joining the same stop leaves that later wait intact.

## Recovery

`recover(observed)` can request a replacement from the current clean
failure while user intent still permits running. It returns `recovered`
when its replacement reaches `running`. A stale snapshot, a superseding
command, or a failed replacement returns `superseded`. Distinct failed
snapshots can each authorize a recovery.

## Diagnostics

The kernel publishes on the `wechaty.async_lifecycle` channel after state
and attempt outcomes are committed. Records contain the configured
non-sensitive name and structural fields from the previous and current
snapshots. Application and cleanup errors stay on the public failure snapshot.

## Minimal composition example

```ts
import { createLifecycle } from './mod.ts'

const lifecycle = createLifecycle({
  async onStart(scope) {
    const timer = setInterval(() => {}, 60_000)
    scope.defer(() => clearInterval(timer))
  },
})

await lifecycle.start()
await lifecycle.stop()
```

## Minimal inheritance example

```ts
import { AsyncLifecycle, type LifecycleScope } from './mod.ts'

class Service extends AsyncLifecycle {
  protected override async onStart(scope: LifecycleScope) {
    const timer = setInterval(() => {}, 60_000)
    scope.defer(() => clearInterval(timer))
  }
}
```
