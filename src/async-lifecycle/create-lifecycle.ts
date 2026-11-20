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
 * Composition entry point: `createLifecycle(hooks, options)`.
 *
 * For a class that already has a base class (Wechaty and Puppet extend an event
 * emitter): it *holds* a lifecycle, keeps the returned controller private, and
 * delegates its public `start` / `stop` / `restart` / `whenState` / `state` to it.
 * Adds no behaviour of its own (v1 design rule 1, "one engine, two shells").
 */

import { LifecycleEngine } from './engine.ts'
import type {
  LifecycleController,
  LifecycleHooks,
  LifecycleOptions,
}                           from './types.ts'

/**
 * Create a lifecycle in composition form.
 *
 * @param hooks   `onStart`, and optionally `onStop` and `onStateChange`.
 * @param options Diagnostics name, deadlines and timer source.
 * @returns A frozen {@link LifecycleController}: the caller API plus `condition`.
 */
function createLifecycle (
  hooks: LifecycleHooks,
  options?: LifecycleOptions,
): LifecycleController {
  const engine = new LifecycleEngine(hooks, options)
  return Object.freeze<LifecycleController>({
    get state () { return engine.state },
    start     : callOptions => engine.start(callOptions),
    stop      : callOptions => engine.stop(callOptions),
    restart   : callOptions => engine.restart(callOptions),
    whenState : (predicate, callOptions) => engine.whenState(predicate, callOptions),
    condition : name => engine.condition(name),
    [Symbol.asyncDispose]: () => engine[Symbol.asyncDispose](),
  })
}

export {
  createLifecycle,
}
