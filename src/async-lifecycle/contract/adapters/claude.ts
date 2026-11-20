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
    'C-CMD-17.a'           : 'D35 divergence: a failed start rejects only after its cleanup completes, not when the failure is decided',
    'C-TIME-05.a-before'   : 'D30 divergence: a deadline is judged only by its timer firing, not by the clock when the outcome is committed (no comparison implementation passes this; the final kernel will)',
    'C-TIME-05.a-after'    : 'D30 divergence: a deadline is judged only by its timer firing, not by the clock when the outcome is committed (no comparison implementation passes this; the final kernel will)',
    'C-TIME-05.b'          : 'D30 divergence: a deadline is judged only by its timer firing, not by the clock when the outcome is committed (no comparison implementation passes this; the final kernel will)',
    'C-TIME-05.c-starting' : 'D30 divergence: a deadline is judged only by its timer firing, not by the clock when the outcome is committed (no comparison implementation passes this; the final kernel will)',
    'C-TIME-05.c-running'  : 'D30 divergence: a deadline is judged only by its timer firing, not by the clock when the outcome is committed (no comparison implementation passes this; the final kernel will)',
    'C-TIME-05.c-late': 'D31 divergence: a late release that is still running is not tracked, so new generations, stop() and the reported state do not wait for it (C-SCOPE-11)',
    'C-TIME-05.d-start': 'D30 divergence: a deadline is judged only by its timer firing, not by the clock when the outcome is committed (no comparison implementation passes this; the final kernel will)',
    'C-TIME-05.d-stop-active': 'D30 divergence: a deadline is judged only by its timer firing, not by the clock when the outcome is committed (no comparison implementation passes this; the final kernel will)',
    'C-TIME-05.d-stop-late': 'D31 divergence: a late release that is still running is not tracked, so new generations, stop() and the reported state do not wait for it (C-SCOPE-11)',
    'C-SCOPE-11.a-stopped': 'D31 divergence: an idle instance keeps showing `stopped` or `failed` while a late release runs, instead of `stopping` (C-SCOPE-11)',
    'C-SCOPE-11.a-failed' : 'D31 divergence: an idle instance keeps showing `stopped` or `failed` while a late release runs, instead of `stopping` (C-SCOPE-11)',
    'C-SCOPE-11.b-failed' : 'D31 divergence: a late release that fails on a cleanly failed instance replaces its failure with a `phase: \'stop\'` failure, instead of keeping it and adding the cleanup error (C-SCOPE-11)',
    'C-SCOPE-11.c-release': 'D31 divergence: a late release that is still running is not tracked, so new generations, stop() and the reported state do not wait for it (C-SCOPE-11)',
    'C-SCOPE-11.c-reject' : 'D31 divergence: a late release that is still running is not tracked, so new generations, stop() and the reported state do not wait for it (C-SCOPE-11)',
    'C-SCOPE-11.c-stop'   : 'D31 divergence: a late release that is still running is not tracked, so new generations, stop() and the reported state do not wait for it (C-SCOPE-11)',
    'C-SCOPE-11.c-timeout': 'D31 divergence: a late release that is still running is not tracked, so new generations, stop() and the reported state do not wait for it (C-SCOPE-11)',
    'C-SCOPE-11.d'        : 'D31 divergence: a late release that is still running is not tracked, so new generations, stop() and the reported state do not wait for it (C-SCOPE-11)',
    'C-SCOPE-11.g-rejects': 'D31 divergence: a late release that is still running is not tracked, so new generations, stop() and the reported state do not wait for it (C-SCOPE-11)',
    'C-SCOPE-11.g-succeeds': 'D31 divergence: a late release that is still running is not tracked, so new generations, stop() and the reported state do not wait for it (C-SCOPE-11)',
    'C-SCOPE-11.h-stop'   : 'D31 divergence: a late release that is still running is not tracked, so new generations, stop() and the reported state do not wait for it (C-SCOPE-11)',
    'C-SCOPE-11.i'        : 'D31 divergence: a late release that is still running is not tracked, so new generations, stop() and the reported state do not wait for it (C-SCOPE-11)',
    'C-SCOPE-11.j'        : 'D31 divergence: a late release that is still running is not tracked, so new generations, stop() and the reported state do not wait for it (C-SCOPE-11)',
    'C-SCOPE-11.k'        : 'D31 divergence: a late release that is still running is not tracked, so new generations, stop() and the reported state do not wait for it (C-SCOPE-11)',
    'C-CHILD-07.a'        : "D32 divergence: a child that restarts itself during its parent's stop is not reported; the parent's stop succeeds while the child runs",
    'C-TIME-01.a'          : 'D11 divergence: a deadline of 0 or above 2^31-1 is accepted instead of throwing RangeError',
    'C-REC-03.d'           : 'D10 divergence: recover() rejects when the replacement fails or the retirement leaves debt, instead of resolving `failed`',
    'C-REC-04.b'           : 'conflict with C-REC-03 (D37): a start() during the recovery\'s retirement supersedes the recovery instead of joining its replacement',
    'C-REC-03.b'           : 'D10 divergence: recover() before `running` rejects instead of resolving `failed`',
    'C-TIME-02.a-success'  : 'B7: the start timeout settles only after retirement, so a stop() from the abort listener supersedes it',
    'C-TIME-02.a-failure'  : 'B7: the start timeout settles only after retirement, so a stop() from the abort listener supersedes it',
    'C-TIME-02.a-timeout'  : 'B7: the start timeout settles only after retirement, so a stop() from the abort listener supersedes it',
    'C-TIME-02.b-start'    : 'B7: start() is still pending at the start deadline; it settles only after retirement',
    'C-TIME-02.b-restart'  : 'B7: the start timeout settles only after retirement, so a restart() from the abort listener supersedes it',
    'C-TIME-02.c'          : 'B7: start() is still pending at the start deadline while the hook has not settled',
    'C-REC-05.b-at-once': 'D10 divergence: recover() rejects when the retirement reports an error, instead of resolving `failed`',
    'C-REC-05.b-during-release': 'D10 divergence: recover() rejects when the retirement reports an error, instead of resolving `failed`',
    'C-SCOPE-11.m': 'D31 divergence: a late release that is still running is not tracked, so new generations, stop() and the reported state do not wait for it (C-SCOPE-11)',
    'C-SCOPE-05.e': 'D38 divergence: a promise returned by an interrupt is ignored, so the resource is released before it settles and its rejection is lost',
    'C-SCOPE-05.f': 'D38 divergence: a promise returned by an interrupt is ignored, so the resource is released before it settles and its rejection is lost',
    'C-SHELL-02.d-stop@AsyncLifecycle': 'D13 divergence: a method override throws a plain Error, not LifecycleOverrideError',
    'C-SHELL-02.d-restart@AsyncLifecycle': 'D13 divergence: a method override throws a plain Error, not LifecycleOverrideError',
    'C-SHELL-02.d-whenState@AsyncLifecycle': 'D13 divergence: a method override throws a plain Error, not LifecycleOverrideError',
    'C-SHELL-02.d-state@AsyncLifecycle': 'D13 divergence: a method override throws a plain Error, not LifecycleOverrideError',
    'C-SHELL-02.d-asyncDispose@AsyncLifecycle': 'D13 divergence: a method override throws a plain Error, not LifecycleOverrideError',
    'C-REC-05.d': 'D10 divergence: recover() rejects when the retirement reports an error, instead of resolving `failed`',
    '2905-E': 'D28 divergence: a wait on a failed generation rejects with the failure itself, not LifecycleSupersededError',
    'C-CHILD-05.g': 'D13 divergence: a child that stops unasked fails the parent with a plain Error, not LifecycleChildFailureError',
    'C-REC-06.a': 'D10 divergence: recover() rejects when the replacement fails, instead of resolving `failed`',
    'S3.I1.late': 'D31 divergence: a late release that is still running is not tracked, so new generations, stop() and the reported state do not wait for it (C-SCOPE-11)',
    'S3.I4.late': 'D31 divergence: a late release that is still running is not tracked, so new generations, stop() and the reported state do not wait for it (C-SCOPE-11)',
    'S3-D31-running': 'D31 divergence: a late release that is still running is not tracked, so new generations, stop() and the reported state do not wait for it (C-SCOPE-11)',
    'S3-D31-stopped': 'D31 divergence: a late release that is still running is not tracked, so new generations, stop() and the reported state do not wait for it (C-SCOPE-11)',
    'C-CMD-07.d': 'B13: a stop() accepted at one microtask while a stopped generation finishes retiring, with a start() queued behind it, resolves and supersedes the start, but the state stays `stopping` forever; later stop() calls resolve without committing `stopped`',
    'S3-B13@createLifecycle': 'B13: a stop() accepted at one microtask while a stopped generation finishes retiring, with a start() queued behind it, resolves and supersedes the start, but the state stays `stopping` forever; later stop() calls resolve without committing `stopped`',
    'S3.I3.late': 'D31 divergence: a late release that is still running is not tracked, so new generations, stop() and the reported state do not wait for it (C-SCOPE-11)',
    'S3-D31-idle': 'D31 divergence: a late release that is still running is not tracked, so new generations, stop() and the reported state do not wait for it (C-SCOPE-11)',
    'C-SCOPE-04.f-interrupt': 'D38 divergence: a promise returned by an interrupt is ignored, so the resource is released before it settles and its rejection is lost',
    'C-RET-01.e': 'B14: tasks are joined in the same newest-first pass as releases, so a resource registered after a task is released before that task finishes (C-RET-01)',
    'C-SCOPE-11.p': 'D31 divergence: a late release that is still running is not tracked, so new generations, stop() and the reported state do not wait for it (C-SCOPE-11)',
    'C-SCOPE-11.q': 'D31 divergence: a late release that is still running is not tracked, so new generations, stop() and the reported state do not wait for it (C-SCOPE-11)',
    'C-SCOPE-11.s-rejects': 'D31 divergence: a late release that is still running is not tracked, so new generations, stop() and the reported state do not wait for it (C-SCOPE-11)',
  },
}

export { claude }
