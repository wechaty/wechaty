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
import type {
  Message,
}                   from './message.js'

import type {
  Wechaty,
}                   from '../wechaty.js'

import {
  ListOption,
  log,
}                   from 'wechaty-puppet'

class Like {

  static get wechaty  (): Wechaty { throw new Error('This class can not be used directly. See: https://github.com/wechaty/wechaty/issues/2027') }
  get wechaty        (): Wechaty { throw new Error('This class can not be used directly. See: https://github.com/wechaty/wechaty/issues/2027') }

  /*
   * @hideconstructor
   */
  constructor () {
    log.verbose('Like', 'constructor()')
  }

  public static async like (message: Message): Promise<boolean> {
    return this.wechaty.puppet.like(message.id)
  }

  public static async cancel (message: Message): Promise<boolean> {
    return this.wechaty.puppet.cancel(message.id)
  }

  public static async list (message: Message, option: ListOption): Promise<boolean> {
    return this.wechaty.puppet.listLikes(message.id, option)
  }

}

function wechatifyLike (_: any): typeof Like {

  return Like

}

export {
  Like,
  wechatifyLike,
}
