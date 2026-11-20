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
 * Contract-suite adapter for the Claude comparison implementation
 * (`src/async-lifecycle-claude/`, #2913), frozen at `731caedd`.
 *
 * Translations, all of names or shapes only:
 * - `onStop` gets `{ reason, signal }`; the adapter adds `generation`, which is
 *   the most recently started generation (only a `running` generation gets
 *   `onStop`, and a replacement starts only after it retires).
 * - `LifecycleOptions.clock` lacks `now()` in this implementation; extra members
 *   are ignored, so the manual clock is passed through.
 *
 * Forwarded unchanged although it differs from S1, so the difference shows up
 * as known failures rather than being hidden by the adapter:
 * - `scope.recover()` **rejects** where S1 resolves `'failed'` (D10): before
 *   `running`, and when the retirement or the replacement fails.
 *
 * Missing: `condition.isSet` (D23).
 */

import {
  AsyncLifecycle,
  createLifecycle,
}                           from '../../../async-lifecycle-claude/mod.ts'
import type * as Claude     from '../../../async-lifecycle-claude/mod.ts'
import type {
  Lifecycle,
  LifecycleCondition,
  LifecycleHooks,
  LifecycleOptions,
  LifecycleScope,
  LifecycleState,
}                           from '../../types.ts'
import type {
  Implementation,
  LifecycleBase,
  MakeSubject,
  Subject,
}                           from '../subject.ts'

/** Present the implementation's scope with the S1 shape. */
function adaptScope (scope: Claude.LifecycleScope): LifecycleScope {
  return Object.freeze<LifecycleScope>({
    generation : scope.generation,
    signal     : scope.signal,
    acquire    : (create, release, options) => scope.acquire(
      create,
      release as (resource: unknown) => void | PromiseLike<void>,
      options,
    ) as Promise<never>,
    use     : resource => scope.use(resource),
    defer   : cleanup => scope.defer(cleanup as () => void | PromiseLike<void>),
    spawn   : task => scope.spawn(task),
    start   : child => scope.start(child as Claude.Lifecycle),
    set     : condition => scope.set(condition as Claude.LifecycleCondition),
    clear   : condition => scope.clear(condition as Claude.LifecycleCondition),
    fail    : error => scope.fail(error),
    // Not translated: a rejection here is a D10 divergence the suite must see.
    recover : reason => scope.recover(reason),
  })
}

/** Translate S1 hooks into this implementation's hooks. */
function adaptHooks (hooks: LifecycleHooks): Required<Claude.LifecycleHooks> {
  let generation = 0
  return {
    onStart: scope => {
      generation = scope.generation
      return hooks.onStart(adaptScope(scope))
    },
    onStop: stop => hooks.onStop?.({ generation, reason: stop.reason, signal: stop.signal }),
    onStateChange: (state, previous) => hooks.onStateChange?.(state as LifecycleState, previous as LifecycleState),
  }
}

const makeComposed: MakeSubject = (hooks, options) => {
  const adapted = adaptHooks(hooks)
  const controller = createLifecycle({
    onStart: adapted.onStart,
    // Only pass optional hooks the test supplied: their presence is observable.
    ...(hooks.onStop ? { onStop: adapted.onStop } : {}),
    ...(hooks.onStateChange ? { onStateChange: adapted.onStateChange } : {}),
  }, options as Claude.LifecycleOptions)
  return {
    lifecycle : controller as unknown as Lifecycle,
    condition : name => controller.condition(name) as unknown as LifecycleCondition,
  }
}

const makeInherited: MakeSubject = (hooks, options) => {
  const adapted = adaptHooks(hooks)
  class Probe extends AsyncLifecycle {

    constructor (probeOptions?: LifecycleOptions) {
      super(probeOptions as Claude.LifecycleOptions)
    }

    protected override onStart (scope: Claude.LifecycleScope) { return adapted.onStart(scope) }
    protected override onStop (stop: Claude.LifecycleStop) { return adapted.onStop(stop) }
    protected override onStateChange (state: Claude.LifecycleState, previous: Claude.LifecycleState) {
      adapted.onStateChange(state, previous)
    }

    declareCondition (name: string): LifecycleCondition {
      return this.condition(name) as unknown as LifecycleCondition
    }

  }
  const probe = new Probe(options)
  const subject: Subject = {
    lifecycle : probe as unknown as Lifecycle,
    condition : name => probe.declareCondition(name),
  }
  return subject
}

/** The Claude comparison implementation. */
const claude: Implementation = {
  name         : 'claude',
  capabilities : new Set([ 'clock', 'scope.acquire', 'acquire.interrupt', 'scope.recover', 'onStop.context' ]),
  shells       : { createLifecycle: makeComposed, AsyncLifecycle: makeInherited },
  base               : AsyncLifecycle as unknown as LifecycleBase,
  diagnosticsChannel : 'wechaty.async-lifecycle-claude',
  knownFailures: {
    'B2'          : 'a spawned task awaiting its own scope.recover() deadlocks the retirement (#2968 §5)',
    'C-SHELL-02.a@AsyncLifecycle': 'D13 divergence: a method override throws a plain Error, not LifecycleOverrideError',
    'C-COND-04.g': 'D28 divergence: a run failure rejects its condition waits with the failure itself, not LifecycleSupersededError',
    'C-COND-04.a'          : 'D28 divergence: a wait on a failed generation rejects with the failure itself, not LifecycleSupersededError',
    'C-TIME-01.a'          : 'D11 divergence: a deadline of 0 or above 2^31-1 is accepted instead of throwing RangeError',
    'C-REC-03.d'           : 'D10 divergence: recover() rejects when the replacement fails or the retirement leaves debt, instead of resolving `failed`',
    'C-REC-04.b'           : 'conflict with C-REC-03 as accepted (pending D37): a start() during the recovery\'s retirement supersedes the recovery instead of joining its replacement',
    'C-REC-03.b'           : 'D10 divergence: recover() before `running` rejects instead of resolving `failed`',
    'C-TIME-02.a-success'  : 'B7: the start timeout settles only after retirement, so a stop() from the abort listener supersedes it',
    'C-TIME-02.a-failure'  : 'B7: the start timeout settles only after retirement, so a stop() from the abort listener supersedes it',
    'C-TIME-02.a-timeout'  : 'B7: the start timeout settles only after retirement, so a stop() from the abort listener supersedes it',
    'C-TIME-02.b-start'    : 'B7: start() is still pending at the start deadline; it settles only after retirement',
    'C-TIME-02.b-restart'  : 'B7: the start timeout settles only after retirement, so a restart() from the abort listener supersedes it',
    'C-TIME-02.c'          : 'B7: start() is still pending at the start deadline while the hook has not settled',
  },
}

export { claude }
