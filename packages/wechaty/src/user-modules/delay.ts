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

class DelayMixin extends wechatifyMixinBase() {

  public milliseconds: number

  static create (milliseconds: number): Delay {
    return new DelayImpl(milliseconds)
  }

  constructor (
    milliseconds: number,
  ) {
    super()
    this.milliseconds = milliseconds
  }

  wait (): Promise<void> {
    return new Promise<void>(resolve => {
      setTimeout(resolve, this.milliseconds)
    })
  }

}

class DelayImpl extends validationMixin(DelayMixin)<Delay>() {}
interface Delay extends DelayImpl {}

/**
 * @deprecated Use `Delay` instead. `DelayInterface` is retained for backwards compatibility.
 */
type DelayInterface = Delay

type DelayConstructor = Constructor<
  Delay,
  typeof DelayImpl
>

export type {
  Delay,
  DelayConstructor,
  DelayInterface,
}
export {
  DelayImpl,
}
