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
 * Composition entry point for the async lifecycle module.
 *
 * A class that already has a base class (Wechaty and Puppet extend an event
 * emitter) holds a lifecycle instead of extending one. `createLifecycle` returns
 * a {@link LifecycleController}: the caller API plus the owner-only `condition`
 * and `recover` members. The owner keeps the controller private and delegates its
 * public `start`/`stop`/`restart`/`whenState`/`state` to it.
 */

import {
  LifecycleKernel,
  toController,
}                           from './controller.ts'
import type {
  LifecycleController,
  LifecycleHooks,
  LifecycleOptions,
}                           from './types.ts'

/**
 * Create a lifecycle in composition form.
 *
 * @param hooks   The implementer's `onStart` / `onStop` / `onStateChange`.
 * @param options Diagnostics name and start/stop deadlines.
 * @returns A {@link LifecycleController} to keep private and delegate to.
 */
function createLifecycle (
  hooks: LifecycleHooks,
  options?: LifecycleOptions,
): LifecycleController {
  const kernel = new LifecycleKernel(hooks, options)
  return toController(kernel)
}

export {
  createLifecycle,
}
