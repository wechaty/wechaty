/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2017 Huan LI <zixia@zixia.net>
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
 *   @ignore
 *
 */

import {
  config,
  log,
}               from './config'
import Contact  from './contact'

/**
 * Send, receive friend request, and friend confirmation events.
 *
 * 1. send request
 * 2. receive request(in friend event)
 * 3. confirmation friendship(friend event)
 *
 * [Example/Friend-Bot]{@link https://github.com/Chatie/wechaty/blob/master/example/friend-bot.ts}
 */
export abstract class FriendRequest {

  public contact: Contact
  public hello: string
  public type: 'send' | 'receive' | 'confirm'

  constructor() {
    log.verbose('FriendRequest', 'constructor()')

    if (!config.puppetInstance()) {
      throw new Error('no Config.puppetInstance() instanciated')
    }
  }

  public abstract send(contact: Contact, hello: string): Promise<boolean>
  public abstract accept(): Promise<boolean>

}

export default FriendRequest
