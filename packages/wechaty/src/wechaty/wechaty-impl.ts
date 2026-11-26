/**
 * Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 * @copyright 2016 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Backwards compatibility module for WechatyImpl.
 *
 * Why this module exists:
 * In Wechaty 1.x and early 2.0-alpha, WechatyImpl was the internal concrete class
 * generated via mixin composition towers (FP.pipe). In Wechaty 2.0 canonical
 * architecture (Plan A / Epic #2938), Wechaty is a clean-slate facade class built with
 * native ECMAScript `#private` fields and standard WinterTC EventTarget.
 *
 * This module re-exports the canonical Wechaty class under the legacy WechatyImpl name
 * and maintains backward-compatible type exports to preserve seamless drop-in compatibility.
 *
 * Architectural boundaries:
 * Part of `packages/wechaty/src/wechaty/`. Re-exports from `./wechaty.ts`.
 */
import {
  Wechaty,
  type WechatyInterface,
  type WechatyConstructor,
} from './wechaty.ts'

export type AllProtectedProperty =
  | 'emit'
  | `_${string}`

export {
  Wechaty,
  Wechaty as WechatyImpl,
  type WechatyInterface,
  type WechatyConstructor,
}
