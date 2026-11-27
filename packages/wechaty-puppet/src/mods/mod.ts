/**
 * Main `wechaty-puppet` entry point: the abstract `Puppet`, `log`, `VERSION`,
 * and the `types`, `payloads`, `filters`, `impls` and `helpers` namespaces.
 */
/**
 *   Wechaty - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016-2018 Huan Li <huan@chatie.io>
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
import {
  log,
  VERSION,
}                             from '../config.ts'
import {
  EventEmitter,
  WechatyEvent,
  WechatyEventTarget,
}                             from '../events/event-target.ts'
import type {
  EventIteratorOptions,
}                             from '../events/event-target.ts'
import type {
  PuppetOptions,
}                             from '../schemas/puppet.ts'
import {
  Puppet,
  PuppetImpl,
}                             from '../puppet/puppet-abstract.ts'
import type {
  PuppetInterface,
  PuppetProtectedProperty,
  PuppetState,
}                             from '../puppet/puppet-interface.ts'
import type {
  PuppetEventTarget,
  PuppetEventTargetInterface,
  PuppetEventEmitterInterface,
}                             from '../puppet/events.ts'
import {
  PuppetEventEmitter,
}                             from '../puppet/events.ts'
import {
  throwUnsupportedError,
}                             from '../throw-unsupported-error.ts'

export type {
  PuppetInterface,
  PuppetProtectedProperty,
  PuppetState,
  PuppetEventTarget,
  PuppetEventTargetInterface,
  PuppetEventEmitterInterface,
  PuppetOptions,
  EventIteratorOptions,
}
export {
  EventEmitter,
  WechatyEvent,
  WechatyEventTarget,
  log,
  Puppet,
  PuppetImpl,
  PuppetEventEmitter,
  throwUnsupportedError,
  VERSION,
}

export type { WrapAsync } from '../pure-functions/async-error.ts'
export * as filters  from './filters.ts'
export * as helpers  from './helpers.ts'
export * as impls    from './impls.ts'
export * as payloads from './payloads.ts'
export * as types    from './types.ts'
