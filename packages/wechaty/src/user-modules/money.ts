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
import type { Constructor } from 'clone-class'
import { validationMixin } from '../user-mixins/validation.ts'

import {
  wechatifyMixinBase,
}                       from '../user-mixins/wechatify.ts'

class MoneyMixin extends wechatifyMixinBase() {

  constructor () {
    super()
  }

}

class MoneyImpl extends validationMixin(MoneyMixin)<Money>() {}
interface Money extends MoneyImpl {}

/**
 * @deprecated Use `Money` instead. `MoneyInterface` is retained for backwards compatibility.
 */
type MoneyInterface = Money

type MoneyConstructor = Constructor<
  Money,
  typeof MoneyImpl
>

export type {
  Money,
  MoneyConstructor,
  MoneyInterface,
}
export {
  MoneyImpl,
}
