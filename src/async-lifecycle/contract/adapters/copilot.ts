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
 * Contract-suite adapter for the Copilot comparison implementation
 * (`src/async-lifecycle-copilot/`, #2912), frozen at `731caedd`.
 *
 * Its API is a superset of S1, so translations are minimal:
 * - `scope.start(child)` resolves with the child; S1 resolves with nothing.
 * - The scope's extra `listen` member and `spawn` options are not exposed.
 *
 * It supports every capability.
 */

import {
  AsyncLifecycle,
  createLifecycle,
}                           from '../../../async-lifecycle-copilot/mod.ts'
import type * as Copilot    from '../../../async-lifecycle-copilot/mod.ts'
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
function adaptScope (scope: Copilot.LifecycleScope): LifecycleScope {
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
    start   : child => scope.start(child as Copilot.Lifecycle).then(() => {}),
    set     : condition => scope.set(condition as Copilot.LifecycleCondition),
    clear   : condition => scope.clear(condition as Copilot.LifecycleCondition),
    fail    : error => scope.fail(error),
    recover : reason => scope.recover(reason),
  })
}

/** Translate S1 hooks into this implementation's hooks. */
function adaptHooks (hooks: LifecycleHooks): Required<Copilot.LifecycleHooks> {
  return {
    onStart       : scope => hooks.onStart(adaptScope(scope)),
    onStop        : stop => hooks.onStop?.(stop),
    onStateChange : (state, previous) => hooks.onStateChange?.(state as LifecycleState, previous as LifecycleState),
  }
}

const makeComposed: MakeSubject = (hooks, options) => {
  const adapted = adaptHooks(hooks)
  const controller = createLifecycle({
    onStart: adapted.onStart,
    // Only pass optional hooks the test supplied: their presence is observable.
    ...(hooks.onStop ? { onStop: adapted.onStop } : {}),
    ...(hooks.onStateChange ? { onStateChange: adapted.onStateChange } : {}),
  }, options as Copilot.LifecycleOptions)
  return {
    lifecycle : controller as unknown as Lifecycle,
    condition : name => controller.condition(name) as unknown as LifecycleCondition,
  }
}

const makeInherited: MakeSubject = (hooks, options) => {
  const adapted = adaptHooks(hooks)
  class Probe extends AsyncLifecycle {

    constructor (probeOptions?: LifecycleOptions) {
      super(probeOptions as Copilot.LifecycleOptions)
    }

    protected override onStart (scope: Copilot.LifecycleScope) { return adapted.onStart(scope) }
    protected override onStop (stop: Copilot.LifecycleStopContext) { return adapted.onStop(stop) }
    protected override onStateChange (state: Copilot.LifecycleState, previous: Copilot.LifecycleState) {
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

/** The Copilot comparison implementation. */
const copilot: Implementation = {
  name         : 'copilot',
  capabilities : new Set([ 'clock', 'scope.acquire', 'acquire.interrupt', 'scope.recover', 'onStop.context', 'condition.isSet' ]),
  shells       : { createLifecycle: makeComposed, AsyncLifecycle: makeInherited },
  base               : AsyncLifecycle as unknown as LifecycleBase,
  diagnosticsChannel : 'wechaty.async-lifecycle',
  knownFailures: {
    'B1'         : 'start() rejects before `failed` is committed, and stop() then resolves on a lifecycle that ends `failed` (#2968 §5)',
    'C-CMD-09.a'  : 'B1: stop() on a clean failure leaves the state `failed` instead of committing `stopped`',
    'C-COND-02.a' : 'B4: a wait created right after stop() is satisfied by the retiring generation',
    'C-COND-04.g': 'D28 divergence: a run failure rejects its condition waits with the failure itself, not LifecycleSupersededError',
    'C-COND-04.f': 'divergence: a restart() whose retirement leaves debt rejects with LifecycleUnsafeStateError (cause = the cleanup error), not the cleanup error itself (C-RET-06)',
    'C-COND-04.a' : 'D28 divergence: a wait on a failed generation rejects with the failure itself, not LifecycleSupersededError',
    'C-COND-04.b1': 'divergence: stop() rejects pre-start waits asynchronously, so a caller abort in the same tick replaces the rejection',
    'C-COND-04.b2': 'B8: a start() then stop() in the same tick still runs onStart, so pre-start waits resolve instead of rejecting',
    'C-CHILD-06.a': 'B1: the parent\'s rollback calls stop() on the cleanly failed child, which stays `failed` instead of committing `stopped`',
    'C-RET-02.a'  :'B1: stop() on a clean failure (after onStop threw) leaves the state `failed` instead of committing `stopped`',
    'C-TIME-02.a-success': 'B1: a stop() accepted while the timed-out generation retires leaves the state `failed`, not `stopped`',
    'C-TIME-02.c'        : 'B1: a stop() accepted while the timed-out generation retires leaves the state `failed`, not `stopped`',
    'C-TIME-03.b'        : 'B6: an onStop rejection after the stop deadline rejects the joining stop() but is missing from the snapshot\'s cleanupError',
    'C-OBS-04.a'         : 'divergence: diagnostics records use a versioned shape (version, instanceId, service, revision, timestamps) instead of { name, previous, state } (C-OBS-04)',
    'C-OBS-01.a'         : 'B1: a stop() from the failed observer resolves while the state is still `failed`',
    'C-REC-04.b'         : 'conflict with C-REC-03 as accepted (pending D37): a start() during the recovery\'s retirement supersedes the recovery instead of joining its replacement',
    'C-RET-02.d'         : 'B6: a cleanup error of undefined (onStop threw undefined) is missing from the failed snapshot\'s cleanupError',
    'C-RET-06.a'         : 'divergence: a restart() whose retirement leaves debt rejects with LifecycleUnsafeStateError (cause = the cleanup error), not the cleanup error itself (C-RET-06)',
    'C-CMD-10.a'         : 'B6: a failed release rejects stop() but is missing from the failed snapshot\'s cleanupError',
    'C-SCOPE-08.a': 'B5: a failed late release on a retired scope is never called again; stop() rejects with the old error',
    'C-SCOPE-09.b': 'B5: the retry stop() rejects at once with the old late-release error instead of retrying the release',
    'C-SCOPE-09.a': 'B5: a failed late release on a retired scope is never called again; stop() rejects with the old error',
  },
}

export { copilot }
