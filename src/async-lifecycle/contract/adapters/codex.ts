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
 * Contract-suite adapter for the Codex comparison implementation
 * (`src/async-lifecycle-codex/`, #2914), frozen at `731caedd`.
 *
 * Translations, all of names or shapes only:
 * - `scope.generation` does not exist. The kernel commits `starting(G)` before
 *   calling `onStart`, so the adapter reads `G` from the public state then.
 * - `onStop` receives the scope instead of `{ generation, reason, signal }`. The
 *   adapter passes an object whose `generation` comes from that scope and whose
 *   `reason` and `signal` throw {@link UnsupportedFeatureError}.
 *
 * Missing, so declared as absent capabilities and never emulated: an injected
 * clock (deadlines use real `performance.now()` and timers), `scope.acquire`
 * (it has `adopt(resource, release)`, which does not record ownership before
 * creation), `acquire`'s `interrupt`, `scope.recover()` (it has an owner-level
 * `recover(observed)` instead), the `onStop` context, and `condition.isSet`.
 */

import {
  AsyncLifecycle,
  createLifecycle,
}                           from '../../../async-lifecycle-codex/mod.ts'
import type * as Codex      from '../../../async-lifecycle-codex/mod.ts'
import type {
  Lifecycle,
  LifecycleCondition,
  LifecycleHooks,
  LifecycleOptions,
  LifecycleScope,
  LifecycleState,
  LifecycleStop,
}                           from '../../types.ts'
import {
  UnsupportedFeatureError,
  type Implementation,
  type MakeSubject,
  type Subject,
}                           from '../subject.ts'

const NAME = 'codex'

/** Present the implementation's scope with the S1 shape. */
function adaptScope (scope: Codex.LifecycleScope, generation: number): LifecycleScope {
  return Object.freeze<LifecycleScope>({
    generation,
    signal  : scope.signal,
    acquire : () => { throw new UnsupportedFeatureError(NAME, 'scope.acquire') },
    use     : resource => scope.use(resource),
    defer   : cleanup => scope.defer(cleanup as () => void | PromiseLike<void>),
    spawn   : task => scope.spawn(task),
    start   : child => scope.start(child as Codex.Lifecycle),
    set     : condition => scope.set(condition as Codex.LifecycleCondition),
    clear   : condition => scope.clear(condition as Codex.LifecycleCondition),
    fail    : error => scope.fail(error),
    recover : () => { throw new UnsupportedFeatureError(NAME, 'scope.recover') },
  })
}

/** An `onStop` argument with only the parts this implementation can supply. */
function stopContext (generation: number): LifecycleStop {
  return Object.freeze({
    generation,
    get reason (): never { throw new UnsupportedFeatureError(NAME, 'the onStop reason') },
    get signal (): never { throw new UnsupportedFeatureError(NAME, 'the onStop deadline signal') },
  })
}

/**
 * Translate S1 hooks into this implementation's hooks. `currentState` reads the
 * lifecycle's public state; it is only called from inside a hook, after the
 * lifecycle object exists.
 */
function adaptHooks (hooks: LifecycleHooks, currentState: () => LifecycleState): Required<Codex.LifecycleHooks> {
  const generations = new WeakMap<Codex.LifecycleScope, number>()
  return {
    onStart: scope => {
      const generation = currentState().generation
      generations.set(scope, generation)
      return hooks.onStart(adaptScope(scope, generation))
    },
    onStop        : scope => hooks.onStop?.(stopContext(generations.get(scope) ?? 0)),
    onStateChange : (state, previous) => hooks.onStateChange?.(state as LifecycleState, previous as LifecycleState),
  }
}

/** Drop options this implementation does not have (`clock`). */
function adaptOptions (options: LifecycleOptions | undefined): Codex.LifecycleOptions | undefined {
  if (!options) {
    return undefined
  }
  const { clock: _clock, ...rest } = options
  return rest
}

const makeComposed: MakeSubject = (hooks, options) => {
  let controller: Codex.LifecycleController | undefined
  const adapted = adaptHooks(hooks, () => controller!.state as LifecycleState)
  controller = createLifecycle({
    onStart: adapted.onStart,
    // Only pass optional hooks the test supplied: their presence is observable.
    ...(hooks.onStop ? { onStop: adapted.onStop } : {}),
    ...(hooks.onStateChange ? { onStateChange: adapted.onStateChange } : {}),
  }, adaptOptions(options))
  const created = controller
  return {
    lifecycle : created as unknown as Lifecycle,
    condition : name => created.condition(name) as unknown as LifecycleCondition,
  }
}

const makeInherited: MakeSubject = (hooks, options) => {
  let probe: Probe | undefined
  const adapted = adaptHooks(hooks, () => probe!.state as LifecycleState)
  class Probe extends AsyncLifecycle {

    constructor (probeOptions?: Codex.LifecycleOptions) {
      super(probeOptions)
    }

    protected override onStart (scope: Codex.LifecycleScope) { return adapted.onStart(scope) }
    protected override onStop (scope: Codex.LifecycleScope) { return adapted.onStop(scope) }
    protected override onStateChange (state: Codex.LifecycleState, previous: Codex.LifecycleState) {
      adapted.onStateChange(state, previous)
    }

    declareCondition (name: string): LifecycleCondition {
      return this.condition(name) as unknown as LifecycleCondition
    }

  }
  probe = new Probe(adaptOptions(options))
  const created = probe
  const subject: Subject = {
    lifecycle : created as unknown as Lifecycle,
    condition : name => created.declareCondition(name),
  }
  return subject
}

/** The Codex comparison implementation. */
const codex: Implementation = {
  name         : NAME,
  capabilities : new Set(),
  shells       : { createLifecycle: makeComposed, AsyncLifecycle: makeInherited },
  knownFailures: {
    B3: 'onStop runs for a run that never reached `running` (#2968 §5)',
  },
}

export { codex }
