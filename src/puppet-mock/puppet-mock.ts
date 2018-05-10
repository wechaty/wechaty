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
import * as fs    from 'fs'
import * as path  from 'path'

import {
  ContactQueryFilter,
  Gender,
  ContactType,

  Puppet,
  PuppetOptions,

  RoomPayload,
  RoomQueryFilter,
}                     from '../puppet/'

import {
  log,
}                   from '../config'
import {
  ContactPayload,
}                   from '../puppet/contact'
import Profile      from '../profile'
import Wechaty      from '../wechaty'

import {
  MockContact,
}                             from './mock-contact'
import { MockFriendRequest }  from './mock-friend-request'
import { MockMessage }        from './mock-message'
import { MockRoom }           from './mock-room'

export type PuppetFoodType = 'scan' | 'ding'
export type ScanFoodType   = 'scan' | 'login' | 'logout'

export class PuppetMock extends Puppet {

  private user?: MockContact

  constructor(
    public options: PuppetOptions = {} as any,
  ) {
    super(
      options.profile
        ? options
        : {
            profile: new Profile(),
            wechaty: new Wechaty(),
          }
      ,
      {
          Contact:        MockContact,
          FriendRequest:  MockFriendRequest,
          Message:        MockMessage,
          Room:           MockRoom,
      },
    )
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

    const from = MockContact.load('xxx_from')
    const to = MockContact.load('xxx_to')
    const msg = new MockMessage()

    msg.from(from)
    msg.to(to)
    msg.text('mock hello')

    this.user = to
    this.emit('login', to)

    setInterval(() => {
      log.verbose('PuppetMock', `start() setInterval() pretending received a new message: ${msg}`)
      this.emit('message', msg)
    }, 3000)

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
    if (this.user) {
      return true
    } else {
      return false
    }
  }

  public userSelf(): MockContact {
    log.verbose('PuppetMock', 'self()')

    if (!this.user) {
      throw new Error('not logged in, no userSelf yet.')
    }

    return this.user
  }

  public async forward(message: MockMessage, sendTo: MockContact | MockRoom): Promise<void> {
    log.silly('PuppetMock', 'forward() to: %s, message: %s)',
                            sendTo, message.filename(),
                            // patchData.ToUserName,
                            // patchData.MMActualContent,
              )
  }

  public async send(message: MockMessage): Promise<void> {
    log.verbose('PuppetMock', 'send(%s)', message)
    // TODO
  }

  public async say(text: string): Promise<void> {
    if (!this.logonoff()) {
      throw new Error('can not say before login')
    }

    const msg = new MockMessage()
    msg.puppet = this

    msg.from(this.userSelf())
    msg.to(this.userSelf())
    msg.text(text)

    await this.send(msg)
  }

  public async logout(): Promise<void> {
    log.verbose('PuppetMock', 'logout()')

    if (!this.logonoff()) {
      throw new Error('logout before login?')
    }

    this.emit('logout', this.user!) // becore we will throw above by logonoff() when this.user===undefined
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

  public async contactAvatar(contact: MockContact): Promise<NodeJS.ReadableStream> {
    const WECHATY_ICON_PNG = path.resolve('../../docs/images/wechaty-icon.png')
    return fs.createReadStream(WECHATY_ICON_PNG)
  }

  public async contactPayload(contact: MockContact): Promise<ContactPayload> {
    return {
      gender: Gender.UNKNOWN,
      type:   ContactType.UNKNOWN,
    }

  }

  public async roomPayload(room: MockRoom): Promise<RoomPayload> {
    return {
      topic          : 'mock topic',
      memberList     : [],
      nameMap        : {} as any,
      roomAliasMap   : {} as any,
      contactAliasMap: {} as any,
    }
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
