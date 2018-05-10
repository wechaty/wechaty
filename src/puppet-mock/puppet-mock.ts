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
  ContactPayload,

  Puppet,
  PuppetOptions,

  RoomPayload,
  RoomQueryFilter,
}                     from '../puppet/'

import {
  log,
}                   from '../config'
// import Profile      from '../profile'
// import Wechaty      from '../wechaty'

import {
  Contact,
}                             from '../puppet/contact'
import { FriendRequest }  from '../puppet/friend-request'
import { Room }           from '../puppet/room'

import { MockMessage }        from './mock-message'

export type PuppetFoodType = 'scan' | 'ding'
export type ScanFoodType   = 'scan' | 'login' | 'logout'

export class PuppetMock extends Puppet {

  private user?: Contact

  constructor(
    public options: PuppetOptions,
  ) {
    super(
      options,
      {
        Contact:        Contact,
        FriendRequest:  FriendRequest,
        Message:        MockMessage,
        Room:           Room,
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

    const from = Contact.load('xxx_from')
    const to = Contact.load('xxx_to')
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

  public userSelf(): Contact {
    log.verbose('PuppetMock', 'self()')

    if (!this.user) {
      throw new Error('not logged in, no userSelf yet.')
    }

    return this.user
  }

  public async forward(message: MockMessage, sendTo: Contact | Room): Promise<void> {
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

  public contactAlias(contact: Contact)                      : Promise<string>
  public contactAlias(contact: Contact, alias: string | null): Promise<void>

  public async contactAlias(contact: Contact, alias?: string|null): Promise<void | string> {
    if (typeof alias === 'undefined') {
      return 'mock alias'
    }
    return
  }

  public async contactFindAll(query: ContactQueryFilter): Promise<Contact[]> {
    return []
  }

  public async contactAvatar(contact: Contact): Promise<NodeJS.ReadableStream> {
    const WECHATY_ICON_PNG = path.resolve('../../docs/images/wechaty-icon.png')
    return fs.createReadStream(WECHATY_ICON_PNG)
  }

  public async contactPayload(contact: Contact): Promise<ContactPayload> {
    return {
      gender: Gender.UNKNOWN,
      type:   ContactType.UNKNOWN,
    }

  }

  public async roomPayload(room: Room): Promise<RoomPayload> {
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
  ): Promise<Room[]> {
    return []
  }

  public async roomDel(
    room: Room,
    contact: Contact,
  ): Promise<void> {
    //
  }

  public async roomAdd(
    room: Room,
    contact: Contact,
  ): Promise<void> {
    //
  }

  public async roomTopic(room: Room, topic?: string): Promise<void | string> {
    if (typeof topic === 'undefined') {
      return 'mock room topic'
    }
    return
  }

  public async roomCreate(contactList: Contact[], topic: string): Promise<Room> {
    if (!contactList || ! contactList.map) {
      throw new Error('contactList not found')
    }
    const r = Room.load('mock room id') as Room
    r.puppet = this
    return r
  }

  public async roomQuit(room: Room): Promise<void> {
    //
  }

  public async friendRequestSend(contact: Contact, hello: string): Promise<void> {
    //
  }

  public async friendRequestAccept(contact: Contact, ticket: string): Promise<void> {
    //
  }

}

export default PuppetMock
