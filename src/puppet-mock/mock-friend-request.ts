/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2018 Huan LI <zixia@zixia.net>
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
 */

import {
  // config,
  log,
}                     from '../config'
import FriendRequest  from '../puppet/friend-request'

import MockContact     from './mock-contact'

export class MockFriendRequest extends FriendRequest {

  public info: any

  private ticket: string

  constructor() {
    log.verbose('MockFriendRequest', 'constructor()')
    super()
  }

  public receive(info: any): void {
    log.verbose('MockFriendRequest', 'receive(%s)', info)
  }

  public confirm(contact: MockContact): void {
    log.verbose('MockFriendRequest', 'confirm(%s)', contact)
  }

  public async send(contact: MockContact, hello = 'Hi'): Promise<void> {
    log.verbose('MockFriendRequest', 'send(%s)', contact)
    await this.puppet.friendRequestSend(contact, hello)
  }

  public async accept(): Promise<void> {
    log.verbose('FriendRequest', 'accept() %s', this.contact)
    await this.puppet.friendRequestAccept(this.contact, this.ticket)
  }

}

export default MockFriendRequest
