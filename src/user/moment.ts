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
import { Wechaty } from '../wechaty'

import { Contact } from './contact'

class Moment {

  static get wechaty  (): Wechaty { throw new Error('This class can not be used directory. See: https://github.com/wechaty/wechaty/issues/2027') }
  get wechaty        (): Wechaty { throw new Error('This class can not be used directory. See: https://github.com/wechaty/wechaty/issues/2027') }

  public static post () {
    // post new moment
  }

  public static timeline (contact: Contact): Moment[] {
    // list all moment
    if (contact) {
      //
    }
    return []
  }

  /*
   * @hideconstructor
   */
  constructor () {
    //
  }

}

function wechatifyMoment (wechaty: Wechaty): typeof Moment {

  class WechatifiedMoment extends Moment {

    static get wechaty  () { return wechaty }
    get wechaty        () { return wechaty }

  }

  return WechatifiedMoment

}

export {
  Moment,
  wechatifyMoment,
}
