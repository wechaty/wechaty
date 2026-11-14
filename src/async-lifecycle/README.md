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

## Conditions

`condition(name)` creates a reusable generation-bound condition.

Rules:

- waits created during `starting`/`running` bind to that generation
- waits created while stopped/failed bind to the next generation
- a wait resolves only when that generation sets the condition
- a wait rejects if that generation fails or retires first

## Recovery

`recover(observed)` is authority-checked:

- returns `'superseded'` unless `observed` is still the current failed snapshot
- accepted recovery does not increment user intent revision
- later user commands still win

## Diagnostics

The kernel publishes post-commit snapshots on `node:diagnostics_channel` channel:

- `wechaty.async_lifecycle`

Publishing occurs only when subscribers exist and never changes lifecycle outcomes.

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
