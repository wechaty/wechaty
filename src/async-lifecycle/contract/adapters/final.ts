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
    'C-CHILD-07.a': 'D32 divergence: a child that restarts itself during its parent\'s stop is not reported; the parent\'s stop succeeds while the child runs',
  },
}

export { final }
