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
import * as path  from 'path'

import {
  FileBox,
}             from 'file-box'

import {
  Message,
  MessagePayload,
}                       from '../puppet/message'
import {
  Contact,
  ContactQueryFilter,
  Gender,
  ContactType,
  ContactPayload,
}                       from '../puppet/contact'
import {
  Room,
  RoomPayload,
  RoomQueryFilter,
}                       from '../puppet/room'
// import {
//   FriendRequest,
// }                       from '../puppet/friend-request'
import {
  Puppet,
  PuppetOptions,
}                       from '../puppet/'

import {
  log,
}                       from '../config'
// import Profile      from '../profile'
// import Wechaty      from '../wechaty'

export type PuppetFoodType = 'scan' | 'ding'
export type ScanFoodType   = 'scan' | 'login' | 'logout'

export class PuppetMock extends Puppet {

  private user?: Contact

  constructor(
    public options: PuppetOptions,
  ) {
    super(
      options,
      // {
      //   Contact:        Contact,
      //   FriendRequest:  FriendRequest,
      //   Message:        Message,
      //   Room:           Room,
      // },
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

    const user = Contact.load('logined_user_id')
    const msg  = Message.createMT('mock_id')

    this.user = user
    this.emit('login', user)

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

  public async messagePayload(message: Message): Promise<MessagePayload> {
    log.verbose('PuppetMock', 'messagePayload(%s)', message)
    const payload: MessagePayload = {
      type : Message.Type.Text,
      from : Contact.load('xxx'),
      text : 'mock message text',
      date : new Date(),
      to: this.userSelf(),
    }
    return payload
  }

  public async messageSend(message: Message): Promise<void> {
    log.verbose('PuppetMock', 'messageSend(%s)', message)
  }

  public async messageForward(message: Message, to: Contact | Room): Promise<void> {
    log.verbose('PuppetMock', 'messageForward(%s, %s)',
                              message,
                              to,
              )
  }

  public async send(message: Message): Promise<void> {
    log.verbose('PuppetMock', 'send(%s)', message)
    // TODO
  }

  public async say(text: string): Promise<void> {
    if (!this.logonoff()) {
      throw new Error('can not say before login')
    }

    const msg = Message.createMO({
      text,
      to: this.userSelf(),
    })
    msg.puppet = this

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
    log.verbose('PuppetMock', 'contactAlias(%s, %s)', contact, alias)

    if (typeof alias === 'undefined') {
      return 'mock alias'
    }
    return
  }

  public async contactFindAll(query: ContactQueryFilter): Promise<Contact[]> {
    log.verbose('PuppetMock', 'contactFindAll(%s)', query)

    return []
  }

  public async contactAvatar(contact: Contact): Promise<FileBox> {
    log.verbose('PuppetMock', 'contactAvatar(%s)', contact)

    const WECHATY_ICON_PNG = path.resolve('../../docs/images/wechaty-icon.png')
    return FileBox.fromLocal(WECHATY_ICON_PNG)
  }

  public async contactPayload(contact: Contact): Promise<ContactPayload> {
    log.verbose('PuppetMock', 'contactPayload(%s)', contact)

    return {
      gender: Gender.Unknown,
      type:   ContactType.Unknown,
    }

  }

  public async roomPayload(room: Room): Promise<RoomPayload> {
    log.verbose('PuppetMock', 'roomPayload(%s)', room)

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
    log.verbose('PuppetMock', 'roomFindAll(%s)', query)

    return []
  }

  public async roomDel(
    room    : Room,
    contact : Contact,
  ): Promise<void> {
    log.verbose('PuppetMock', 'roomDel(%s, %s)', room, contact)
  }

  public async roomAdd(
    room    : Room,
    contact : Contact,
  ): Promise<void> {
    log.verbose('PuppetMock', 'roomAdd(%s, %s)', room, contact)
  }

  public async roomTopic(room: Room, topic?: string): Promise<void | string> {
    log.verbose('PuppetMock', 'roomTopic(%s, %s)', room, topic)

    if (typeof topic === 'undefined') {
      return 'mock room topic'
    }
    return
  }

  public async roomCreate(contactList: Contact[], topic: string): Promise<Room> {
    log.verbose('PuppetMock', 'roomCreate(%s, %s)', contactList, topic)

    if (!contactList || ! contactList.map) {
      throw new Error('contactList not found')
    }
    const r = Room.load('mock room id') as Room
    r.puppet = this
    return r
  }

  public async roomQuit(room: Room): Promise<void> {
    log.verbose('PuppetMock', 'roomQuit(%s)', room)
  }

  public async friendRequestSend(contact: Contact, hello: string): Promise<void> {
    log.verbose('PuppetMock', 'friendRequestSend(%s, %s)', contact, hello)
  }

  public async friendRequestAccept(contact: Contact, ticket: string): Promise<void> {
    log.verbose('PuppetMock', 'friendRequestAccept(%s, %s)', contact, ticket)
  }

}

export default PuppetMock
