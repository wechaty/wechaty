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
      // A type cast only: D38 widened `interrupt` to return `unknown`, and
      // Copilot already awaits a returned promise-like.
      options as Copilot.AcquireOptions<unknown> | undefined,
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
    'B1'         : 'stop() after a clean failure resolves on a lifecycle that ends `failed` instead of `stopped` (#2968 §5; its first half was withdrawn by D35)',
    'C-OBS-03.b' : 'D34 divergence: onStart is called for a generation that a stop() from the starting observer already retires',
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
    'C-REC-04.b'         : 'conflict with C-REC-03 (D37): a start() during the recovery\'s retirement supersedes the recovery instead of joining its replacement',
    'C-RET-02.d'         : 'B6: a cleanup error of undefined (onStop threw undefined) is missing from the failed snapshot\'s cleanupError',
    'C-RET-06.a'         : 'divergence: a restart() whose retirement leaves debt rejects with LifecycleUnsafeStateError (cause = the cleanup error), not the cleanup error itself (C-RET-06)',
    'C-CMD-10.a'         : 'B6: a failed release rejects stop() but is missing from the failed snapshot\'s cleanupError',
    'C-SCOPE-08.a': 'B5: a failed late release on a retired scope is never called again; stop() rejects with the old error',
    'C-SCOPE-09.b': 'B5: the retry stop() rejects at once with the old late-release error instead of retrying the release',
    'C-TIME-05.a-before' : 'D30 divergence: a deadline is judged only by its timer firing, not by the clock when the outcome is committed (no comparison implementation passes this; the final kernel will)',
    'C-TIME-05.a-after'  : 'D30 divergence: a deadline is judged only by its timer firing, not by the clock when the outcome is committed (no comparison implementation passes this; the final kernel will)',
    'C-TIME-05.b'        : 'D30 divergence: a deadline is judged only by its timer firing, not by the clock when the outcome is committed (no comparison implementation passes this; the final kernel will)',
    'C-TIME-05.c-starting': 'D30 divergence: a deadline is judged only by its timer firing, not by the clock when the outcome is committed (no comparison implementation passes this; the final kernel will)',
    'C-TIME-05.c-running': 'D30 divergence: a deadline is judged only by its timer firing, not by the clock when the outcome is committed (no comparison implementation passes this; the final kernel will)',
    'C-TIME-05.c-late': 'D31 divergence: a restart() while a late release runs on the idle instance fails its new generation with LifecycleUnsafeStateError, instead of joining the release as a retirement pass (C-SCOPE-11)',
    'C-TIME-05.d-start': 'D30 divergence: a deadline is judged only by its timer firing, not by the clock when the outcome is committed (no comparison implementation passes this; the final kernel will)',
    'C-TIME-05.d-stop-active': 'D30 divergence: a deadline is judged only by its timer firing, not by the clock when the outcome is committed (no comparison implementation passes this; the final kernel will)',
    'C-TIME-05.d-stop-late': 'D30 divergence: a deadline is judged only by its timer firing, not by the clock when the outcome is committed (no comparison implementation passes this; the final kernel will)',
    'C-SCOPE-11.a-stopped': 'D31 divergence: an idle instance keeps showing `stopped` or `failed` while a late release runs, instead of `stopping` (C-SCOPE-11)',
    'C-SCOPE-11.a-failed': 'D31 divergence: an idle instance keeps showing `stopped` or `failed` while a late release runs, instead of `stopping` (C-SCOPE-11)',
    'C-SCOPE-11.b-stopped': 'B5: the stop() that should retry the failed late release rejects with the old error',
    'C-SCOPE-11.b-failed': 'D31 divergence: a late release that fails on a cleanly failed instance replaces its failure with a `phase: \'stop\'` failure, instead of keeping it and adding the cleanup error (C-SCOPE-11)',
    'C-SCOPE-11.c-already-released': 'D31 divergence: a late release that starts while another generation is live fails that generation with LifecycleUnsafeStateError, instead of making a starting generation wait or letting a running one continue (C-SCOPE-11)',
    'C-SCOPE-11.c-release': 'D31 divergence: a late release that starts while another generation is live fails that generation with LifecycleUnsafeStateError, instead of making a starting generation wait or letting a running one continue (C-SCOPE-11)',
    'C-SCOPE-11.c-reject': 'D31 divergence: a late release that starts while another generation is live fails that generation with LifecycleUnsafeStateError, instead of making a starting generation wait or letting a running one continue (C-SCOPE-11)',
    'C-SCOPE-11.c-stop' : 'D31 divergence: a late release that starts while another generation is live fails that generation with LifecycleUnsafeStateError, instead of making a starting generation wait or letting a running one continue (C-SCOPE-11)',
    'C-SCOPE-11.c-timeout': 'D31 divergence: a late release that starts while another generation is live fails that generation with LifecycleUnsafeStateError, instead of making a starting generation wait or letting a running one continue (C-SCOPE-11)',
    'C-SCOPE-11.d'      : 'D31 divergence: a late release that starts while another generation is live fails that generation with LifecycleUnsafeStateError, instead of making a starting generation wait or letting a running one continue (C-SCOPE-11)',
    'C-SCOPE-11.f-stop-succeeds': 'D31 divergence: a late release that starts while another generation is live fails that generation with LifecycleUnsafeStateError, instead of making a starting generation wait or letting a running one continue (C-SCOPE-11)',
    'C-SCOPE-11.f-stop-fails': 'D31 divergence: a late release that starts while another generation is live fails that generation with LifecycleUnsafeStateError, instead of making a starting generation wait or letting a running one continue (C-SCOPE-11)',
    'C-SCOPE-11.f-restart-succeeds': 'D31 divergence: a late release that starts while another generation is live fails that generation with LifecycleUnsafeStateError, instead of making a starting generation wait or letting a running one continue (C-SCOPE-11)',
    'C-SCOPE-11.f-restart-fails': 'D31 divergence: a late release that starts while another generation is live fails that generation with LifecycleUnsafeStateError, instead of making a starting generation wait or letting a running one continue (C-SCOPE-11)',
    'C-SCOPE-11.g-rejects': 'D31 divergence: a late release that starts while another generation is live fails that generation with LifecycleUnsafeStateError, instead of making a starting generation wait or letting a running one continue (C-SCOPE-11)',
    'C-SCOPE-11.g-succeeds': 'D31 divergence: a late release that starts while another generation is live fails that generation with LifecycleUnsafeStateError, instead of making a starting generation wait or letting a running one continue (C-SCOPE-11)',
    'C-SCOPE-11.h-start': 'D31 divergence: a late release that starts while another generation is live fails that generation with LifecycleUnsafeStateError, instead of making a starting generation wait or letting a running one continue (C-SCOPE-11)',
    'C-SCOPE-11.h-stop' : 'D31 divergence: a late release that starts while another generation is live fails that generation with LifecycleUnsafeStateError, instead of making a starting generation wait or letting a running one continue (C-SCOPE-11)',
    'C-SCOPE-11.i'      : 'D31 divergence: a late release that starts while another generation is live fails that generation with LifecycleUnsafeStateError, instead of making a starting generation wait or letting a running one continue (C-SCOPE-11)',
    'C-SCOPE-11.j'      : 'D31 divergence: a late release that starts while another generation is live fails that generation with LifecycleUnsafeStateError, instead of making a starting generation wait or letting a running one continue (C-SCOPE-11)',
    'C-SCOPE-11.k'      : 'D31 divergence: a late release that starts while another generation is live fails that generation with LifecycleUnsafeStateError, instead of making a starting generation wait or letting a running one continue (C-SCOPE-11)',
    'C-CHILD-07.a'      : "D32 divergence: a child that restarts itself during its parent's stop is not reported; the parent's stop succeeds while the child runs",
    'C-SCOPE-02.d-stop-release': 'B10: a stop() or restart() does not wait for a cleanup registered during its own retirement; it rejects at once and the state stays failed after the cleanup finishes',
    'C-SCOPE-02.d-stop-fail': 'B10: a stop() or restart() does not wait for a cleanup registered during its own retirement; it rejects at once and the state stays failed after the cleanup finishes',
    'C-SCOPE-02.d-stop-timeout': 'B10: a stop() or restart() does not wait for a cleanup registered during its own retirement; it rejects at once and the state stays failed after the cleanup finishes',
    'C-SCOPE-02.d-restart-release': 'B10: a stop() or restart() does not wait for a cleanup registered during its own retirement; it rejects at once and the state stays failed after the cleanup finishes',
    'C-SCOPE-02.d-restart-fail': 'B10: a stop() or restart() does not wait for a cleanup registered during its own retirement; it rejects at once and the state stays failed after the cleanup finishes',
    'C-SCOPE-02.d-restart-timeout': 'B10: a stop() or restart() does not wait for a cleanup registered during its own retirement; it rejects at once and the state stays failed after the cleanup finishes',
    'C-TIME-03.c'        : 'D36 divergence: a stop() joining a timed-out pass reports the release that failed in it without retrying it',
    'C-TIME-03.h'        : 'D36 divergence: a stop() joining a timed-out pass reports the release that failed in it without retrying it',
    'C-SCOPE-09.c'       : 'B5: the stop() meant to time out rejects at once with the old late-release error, without retrying it',
    'C-SCOPE-09.a': 'B5: a failed late release on a retired scope is never called again; stop() rejects with the old error',
    'C-REC-05.c': 'conflict with C-REC-03 and C-REC-05: a task calling recover() while a recovery retires joins it as another requester (gets `recovered`, exempt from the join), instead of getting `superseded`',
    'C-RET-02.e-null': 'B6: a cleanup error rejects stop() but is missing from the failed snapshot\'s cleanupError',
    'C-RET-02.e-false': 'B6: a cleanup error rejects stop() but is missing from the failed snapshot\'s cleanupError',
    'C-SCOPE-02.e-release': 'conflict with C-SCOPE-02: fail() on a sealed (retiring) scope still fails the generation, overriding the stop or recovery',
    'C-SCOPE-02.e-onStart': 'conflict with C-SCOPE-02: fail() on a sealed (retiring) scope still fails the generation, overriding the stop or recovery',
    'C-SCOPE-02.e-onStop': 'conflict with C-SCOPE-02: fail() on a sealed (retiring) scope still fails the generation, overriding the stop or recovery',
    'C-SCOPE-10.a-sync': 'B6: a cleanup error rejects stop() but is missing from the failed snapshot\'s cleanupError',
    'C-SCOPE-10.a-async': 'B6: a cleanup error rejects stop() but is missing from the failed snapshot\'s cleanupError',
    'C-SCOPE-11.m': 'D31 divergence: a start() queued during an idle late release is refused with LifecycleUnsafeStateError instead of waiting for it (C-SCOPE-11)',
    'C-TIME-03.i': 'B6: a cleanup error rejects stop() but is missing from the failed snapshot\'s cleanupError',
    'C-SCOPE-05.e': 'D38 divergence: each interrupt is awaited before the next one is called, so a pending interrupt keeps the older resources from being interrupted',
    'C-SCOPE-05.f': 'B6: the interrupt\'s rejection rejects stop() but is missing from the failed snapshot\'s cleanupError',
    'C-CHILD-05.e-stops': 'D39 divergence: a child that stops or fails unasked while its parent retires still fails the parent with LifecycleChildFailureError',
    'C-CHILD-05.e-fails': 'D39 divergence: a child that stops or fails unasked while its parent retires still fails the parent with LifecycleChildFailureError',
    'C-REC-05.d': 'conflict with C-REC-03 and C-REC-05: a task calling recover() while a recovery retires joins it as another requester (gets `recovered`, exempt from the join), instead of getting `superseded`',
    '2905-D': 'B1: stop() on a clean failure leaves the state `failed` instead of committing `stopped`',
    '2905-E': 'D28 divergence: a wait on a failed generation rejects with the failure itself, not LifecycleSupersededError',
    'C-CHILD-05.f-stop': 'B1: the parent\'s retirement stops the cleanly failed child, which stays `failed` instead of committing `stopped`',
    'S3.I11': 'B1: stop() on a clean failure leaves the state `failed` instead of committing `stopped`',
    'S3-B1': 'B1: stop() on a clean failure leaves the state `failed` instead of committing `stopped`',
    'S3-B13': 'B1: stop() on a clean failure leaves the state `failed` instead of committing `stopped`',
    'S3.I4.late': 'D31 divergence: an idle instance keeps showing `stopped` or `failed` while a late release runs, instead of `stopping` (C-SCOPE-11)',
    'S3-D31-idle': 'D31 divergence: an idle instance keeps showing `stopped` or `failed` while a late release runs, instead of `stopping` (C-SCOPE-11)',
    'S3-D31-stopped': 'D31 divergence: an idle instance keeps showing `stopped` or `failed` while a late release runs, instead of `stopping` (C-SCOPE-11)',
    'C-SCOPE-04.f-release': 'D41 divergence: a late acquisition rejects only after its release finishes, so a hanging release leaves acquire() pending (C-SCOPE-04)',
    'C-SCOPE-04.f-interrupt': 'D41 divergence: a late acquisition rejects only after its release finishes, so a hanging release leaves acquire() pending (C-SCOPE-04)',
    'S3.I5.acquire': 'D41 divergence: a late acquisition rejects only after its release finishes, so a hanging release leaves acquire() pending (C-SCOPE-04)',
    'S3-D41': 'D41 divergence: a late acquisition rejects only after its release finishes, so a hanging release leaves acquire() pending (C-SCOPE-04)',
    'C-RET-01.e': 'B14: tasks are joined in the same newest-first pass as releases, so a resource registered after a task is released before that task finishes (C-RET-01)',
    'C-SCOPE-11.n': 'B1: stop() on a clean failure leaves the state `failed` instead of committing `stopped`',
    'C-SCOPE-11.o': 'D31 divergence: late releases are not obligations of the instance as C-SCOPE-11 describes; a late release fails a live generation at once, and an idle instance keeps `stopped`',
    'C-SCOPE-11.p': 'D31 divergence: late releases are not obligations of the instance as C-SCOPE-11 describes; a late release fails a live generation at once, and an idle instance keeps `stopped`',
    'C-SCOPE-11.r': 'D31 divergence: late releases are not obligations of the instance as C-SCOPE-11 describes; a late release fails a live generation at once, and an idle instance keeps `stopped`',
    'C-SCOPE-11.s-succeeds': 'D31 divergence: late releases are not obligations of the instance as C-SCOPE-11 describes; a late release fails a live generation at once, and an idle instance keeps `stopped`',
    'C-SCOPE-11.s-rejects': 'D31 divergence: late releases are not obligations of the instance as C-SCOPE-11 describes; a late release fails a live generation at once, and an idle instance keeps `stopped`',
  },
}

export { copilot }
