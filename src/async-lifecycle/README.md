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
release immediately and throw the retirement reason. A failed late release is
still owned, including when it comes from a detached generation. Registering
the same callback twice creates two release obligations. A start waiting for
older cleanup joins the current generation if it is still running afterward.
If the current generation fails, its failure snapshot keeps the primary error
while older releases settle. A failed release is reported in `cleanupError`.

An expired deadline rejects the operation and records unresolved cleanup in
`failed`. A later `stop()` can join the existing retirement and retry
unfinished releases. A replacement requires confirmation that owned work
has settled and resources have been released.
Hooks can request another lifecycle operation synchronously. A hook must
return before awaiting a command that depends on that hook settling.

## Conditions

`condition(name)` returns an instance-owned, generation-bound condition.
A wait binds to the open generation or the next generation if the instance
is idle or retiring. Setting the condition resolves waits for that generation.
Retirement rejects any unsatisfied waits. A wait made before the first start
can remain pending across an idle stop.

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
