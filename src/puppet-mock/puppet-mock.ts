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
 *
 */

import {
  ContactQueryFilter,

  Puppet,
  PuppetOptions,

  RoomQueryFilter,
}                   from '../puppet/'

import {
  log,
}                   from '../config'
import {
}                   from '../message'

import MockContact   from './mock-contact'
import MockMessage   from './mock-message'
import MockRoom      from './mock-room'

export type PuppetFoodType = 'scan' | 'ding'
export type ScanFoodType   = 'scan' | 'login' | 'logout'

export class PuppetMock extends Puppet {

  constructor(
    public options: PuppetOptions,
  ) {
    super(options)
  }

  public toString() {
    return `PuppetMock<${this.options.profile.name}>`
  }

  public ding(data?: any): Promise<string> {
    return data
  }

  public async start(): Promise<void> {
    log.verbose('PuppetMock', `start() with ${this.options.profile}`)
    this.state.on('pending')
    // await some tasks...
    this.state.on(true)
  }

  public async stop(): Promise<void> {
    log.verbose('PuppetMock', 'quit()')

    if (this.state.off()) {
      log.warn('PuppetMock', 'quit() is called on a OFF puppet. await ready(off) and return.')
      await this.state.ready('off')
      return
    }
    this.state.off('pending')
    // await some tasks...
    this.state.off(true)
  }

  public logonoff(): boolean {
    return !!(this.user)
  }

  public self(): MockContact {
    log.verbose('PuppetMock', 'self()')

    if (this.user) {
      return this.user as MockContact
    }
    throw new Error('PuppetMock.self() no this.user')
  }

  public async forward(message: MockMessage, sendTo: MockContact | MockRoom): Promise<void> {
    log.silly('PuppetMock', 'forward() to: %s, message: %s)',
                            sendTo, message.filename(),
                            // patchData.ToUserName,
                            // patchData.MMActualContent,
              )
  }

  public async send(message: MockMessage): Promise<void> {
    //
  }

  public async say(text: string): Promise<void> {
    if (!this.logonoff()) {
      throw new Error('can not say before login')
    }

    if (!text) {
      log.warn('PuppetMock', 'say(%s) can not say nothing', text)
      return
    }

    if (!this.user) {
      log.warn('PuppetMock', 'say(%s) can not say because no user', text)
      this.emit('error', new Error('no this.user for PuppetMock'))
      return
    }

    return await this.user.say(text)
  }

  public async logout(): Promise<void> {
    log.verbose('PuppetMock', 'logout()')
    this.user = undefined
  }

  public contactAlias(contact: MockContact)                      : Promise<string>
  public contactAlias(contact: MockContact, alias: string | null): Promise<void>

  public async contactAlias(contact: MockContact, alias?: string|null): Promise<void | string> {
    if (typeof alias === 'undefined') {
      return 'mock alias'
    }
    return
  }

  public async contactFindAll(query: ContactQueryFilter): Promise<MockContact[]> {
    return []
  }

  public async roomFindAll(
    query: RoomQueryFilter = { topic: /.*/ },
  ): Promise<MockRoom[]> {
    return []
  }

  public async roomDel(
    room: MockRoom,
    contact: MockContact,
  ): Promise<void> {
    //
  }

  public async roomAdd(
    room: MockRoom,
    contact: MockContact,
  ): Promise<void> {
    //
  }

  public async roomTopic(room: MockRoom, topic?: string): Promise<void | string> {
    if (typeof topic === 'undefined') {
      return 'mock room topic'
    }
    return
  }

  public async roomCreate(contactList: MockContact[], topic: string): Promise<MockRoom> {
    if (!contactList || ! contactList.map) {
      throw new Error('contactList not found')
    }
    const r = MockRoom.load('mock room id') as MockRoom
    r.puppet = this
    return r
  }

  public async friendRequestSend(contact: MockContact, hello: string): Promise<void> {
    //
  }

  public async friendRequestAccept(contact: MockContact, ticket: string): Promise<void> {
    //
  }

}

export default PuppetMock
