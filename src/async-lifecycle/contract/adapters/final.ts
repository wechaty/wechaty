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
 * Contract-suite adapter for the final kernel in `src/async-lifecycle/`
 * (wechaty/wechaty#2972, S4).
 *
 * The kernel implements the S1 API itself, so this adapter translates nothing:
 * hooks and options pass straight through, and every capability is declared.
 * Its `knownFailures` start as the baseline's (D40: Claude's kernel) and shrink
 * as S4 closes them; an entry is removed in the commit that makes its test pass,
 * because a known failure that starts passing turns the suite red.
 */

import {
  AsyncLifecycle,
  createLifecycle,
  LIFECYCLE_DIAGNOSTICS_CHANNEL,
}                           from '../../mod.ts'
import type {
  LifecycleCondition,
  LifecycleOptions,
  LifecycleScope,
  LifecycleState,
  LifecycleStop,
}                           from '../../types.ts'
import type {
  Implementation,
  LifecycleBase,
  MakeSubject,
}                           from '../subject.ts'

const makeComposed: MakeSubject = (hooks, options) => {
  const controller = createLifecycle(hooks, options)
  return {
    lifecycle : controller,
    condition : name => controller.condition(name),
  }
}

const makeInherited: MakeSubject = (hooks, options) => {
  class Probe extends AsyncLifecycle {

    constructor (probeOptions?: LifecycleOptions) {
      super(probeOptions)
    }

    protected override onStart (scope: LifecycleScope) { return hooks.onStart(scope) }
    protected override onStop (stop: LifecycleStop) { return hooks.onStop?.(stop) }
    protected override onStateChange (state: LifecycleState, previous: LifecycleState) {
      hooks.onStateChange?.(state, previous)
    }

    declareCondition (name: string): LifecycleCondition {
      return this.condition(name)
    }

  }
  const probe = new Probe(options)
  return {
    lifecycle : probe,
    condition : name => probe.declareCondition(name),
  }
}

/** The final kernel. */
const final: Implementation = {
  name               : 'final',
  capabilities       : new Set([ 'clock', 'scope.acquire', 'acquire.interrupt', 'scope.recover', 'onStop.context', 'condition.isSet' ]),
  shells             : { createLifecycle: makeComposed, AsyncLifecycle: makeInherited },
  base               : AsyncLifecycle as unknown as LifecycleBase,
  diagnosticsChannel : LIFECYCLE_DIAGNOSTICS_CHANNEL,
  knownFailures      : {
    'B2': 'a spawned task awaiting its own scope.recover() deadlocks the retirement (#2968 §5)',
    'C-COND-04.g': 'D28 divergence: a run failure rejects its condition waits with the failure itself, not LifecycleSupersededError',
    'C-COND-04.a': 'D28 divergence: a wait on a failed generation rejects with the failure itself, not LifecycleSupersededError',
    'C-CMD-17.a': 'D35 divergence: a failed start rejects only after its cleanup completes, not when the failure is decided',
    'C-TIME-05.a-before': 'D30 divergence: a deadline is judged only by its timer firing, not by the clock when the outcome is committed (no comparison implementation passes this; the final kernel will)',
    'C-TIME-05.a-after': 'D30 divergence: a deadline is judged only by its timer firing, not by the clock when the outcome is committed (no comparison implementation passes this; the final kernel will)',
    'C-TIME-05.b': 'D30 divergence: a deadline is judged only by its timer firing, not by the clock when the outcome is committed (no comparison implementation passes this; the final kernel will)',
    'C-TIME-05.c-starting': 'D30 divergence: a deadline is judged only by its timer firing, not by the clock when the outcome is committed (no comparison implementation passes this; the final kernel will)',
    'C-TIME-05.c-running': 'D30 divergence: a deadline is judged only by its timer firing, not by the clock when the outcome is committed (no comparison implementation passes this; the final kernel will)',
    'C-TIME-05.c-late': 'D31 divergence: a late release that is still running is not tracked, so new generations, stop() and the reported state do not wait for it (C-SCOPE-11)',
    'C-TIME-05.d-start': 'D30 divergence: a deadline is judged only by its timer firing, not by the clock when the outcome is committed (no comparison implementation passes this; the final kernel will)',
    'C-TIME-05.d-stop-active': 'D30 divergence: a deadline is judged only by its timer firing, not by the clock when the outcome is committed (no comparison implementation passes this; the final kernel will)',
    'C-TIME-05.d-stop-late': 'D31 divergence: a late release that is still running is not tracked, so new generations, stop() and the reported state do not wait for it (C-SCOPE-11)',
    'C-SCOPE-11.a-stopped': 'D31 divergence: an idle instance keeps showing `stopped` or `failed` while a late release runs, instead of `stopping` (C-SCOPE-11)',
    'C-SCOPE-11.a-failed': 'D31 divergence: an idle instance keeps showing `stopped` or `failed` while a late release runs, instead of `stopping` (C-SCOPE-11)',
    'C-SCOPE-11.b-failed': 'D31 divergence: a late release that fails on a cleanly failed instance replaces its failure with a `phase: \'stop\'` failure, instead of keeping it and adding the cleanup error (C-SCOPE-11)',
    'C-SCOPE-11.c-release': 'D31 divergence: a late release that is still running is not tracked, so new generations, stop() and the reported state do not wait for it (C-SCOPE-11)',
    'C-SCOPE-11.c-reject': 'D31 divergence: a late release that is still running is not tracked, so new generations, stop() and the reported state do not wait for it (C-SCOPE-11)',
    'C-SCOPE-11.c-stop': 'D31 divergence: a late release that is still running is not tracked, so new generations, stop() and the reported state do not wait for it (C-SCOPE-11)',
    'C-SCOPE-11.c-timeout': 'D31 divergence: a late release that is still running is not tracked, so new generations, stop() and the reported state do not wait for it (C-SCOPE-11)',
    'C-SCOPE-11.d': 'D31 divergence: a late release that is still running is not tracked, so new generations, stop() and the reported state do not wait for it (C-SCOPE-11)',
    'C-SCOPE-11.g-rejects': 'D31 divergence: a late release that is still running is not tracked, so new generations, stop() and the reported state do not wait for it (C-SCOPE-11)',
    'C-SCOPE-11.g-succeeds': 'D31 divergence: a late release that is still running is not tracked, so new generations, stop() and the reported state do not wait for it (C-SCOPE-11)',
    'C-SCOPE-11.h-stop': 'D31 divergence: a late release that is still running is not tracked, so new generations, stop() and the reported state do not wait for it (C-SCOPE-11)',
    'C-SCOPE-11.i': 'D31 divergence: a late release that is still running is not tracked, so new generations, stop() and the reported state do not wait for it (C-SCOPE-11)',
    'C-SCOPE-11.j': 'D31 divergence: a late release that is still running is not tracked, so new generations, stop() and the reported state do not wait for it (C-SCOPE-11)',
    'C-SCOPE-11.k': 'D31 divergence: a late release that is still running is not tracked, so new generations, stop() and the reported state do not wait for it (C-SCOPE-11)',
    'C-CHILD-07.a': 'D32 divergence: a child that restarts itself during its parent\'s stop is not reported; the parent\'s stop succeeds while the child runs',
    'C-TIME-01.a': 'D11 divergence: a deadline of 0 or above 2^31-1 is accepted instead of throwing RangeError',
    'C-REC-03.d': 'D10 divergence: recover() rejects when the replacement fails or the retirement leaves debt, instead of resolving `failed`',
    'C-REC-04.b': 'conflict with C-REC-03 (D37): a start() during the recovery\'s retirement supersedes the recovery instead of joining its replacement',
    'C-REC-03.b': 'D10 divergence: recover() before `running` rejects instead of resolving `failed`',
    'C-TIME-02.a-success': 'B7: the start timeout settles only after retirement, so a stop() from the abort listener supersedes it',
    'C-TIME-02.a-failure': 'B7: the start timeout settles only after retirement, so a stop() from the abort listener supersedes it',
    'C-TIME-02.a-timeout': 'B7: the start timeout settles only after retirement, so a stop() from the abort listener supersedes it',
    'C-TIME-02.b-start': 'B7: start() is still pending at the start deadline; it settles only after retirement',
    'C-TIME-02.b-restart': 'B7: the start timeout settles only after retirement, so a restart() from the abort listener supersedes it',
    'C-TIME-02.c': 'B7: start() is still pending at the start deadline while the hook has not settled',
    'C-REC-05.b-at-once': 'D10 divergence: recover() rejects when the retirement reports an error, instead of resolving `failed`',
    'C-REC-05.b-during-release': 'D10 divergence: recover() rejects when the retirement reports an error, instead of resolving `failed`',
    'C-SCOPE-11.m': 'D31 divergence: a late release that is still running is not tracked, so new generations, stop() and the reported state do not wait for it (C-SCOPE-11)',
    'C-SCOPE-05.e': 'D38 divergence: a promise returned by an interrupt is ignored, so the resource is released before it settles and its rejection is lost',
    'C-SCOPE-05.f': 'D38 divergence: a promise returned by an interrupt is ignored, so the resource is released before it settles and its rejection is lost',
    'C-REC-05.d': 'D10 divergence: recover() rejects when the retirement reports an error, instead of resolving `failed`',
    '2905-E': 'D28 divergence: a wait on a failed generation rejects with the failure itself, not LifecycleSupersededError',
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
  },
}

export { final }
