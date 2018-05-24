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
}                       from '../message'
import {
  Contact,
  ContactQueryFilter,
  Gender,
  ContactType,
  ContactPayload,
}                       from '../contact'
import {
  Room,
  RoomPayload,
  RoomQueryFilter,
}                       from '../room'
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

export type PuppetFoodType = 'scan' | 'ding'
export type ScanFoodType   = 'scan' | 'login' | 'logout'

export interface MockContactRawPayload {
  name : string,
}

export interface MockMessageRawPayload {
  from : string,
  to   : string,
  text : string
}

export interface MockRoomRawPayload {
  topic: string,
  memberList: string[],
  owner: string,
}

export class PuppetMock extends Puppet {

  constructor(
    public options: PuppetOptions,
  ) {
    super(options)
  }

  public ding(data?: any): Promise<string> {
    return data
  }

  public async start(): Promise<void> {
    log.verbose('PuppetMock', `start() with ${this.options.profile}`)

    this.state.on('pending')
    // await some tasks...
    this.state.on(true)

    this.userId = 'logined_user_id'
    const user = this.Contact.load(this.userId)
    this.emit('login', user)

    const msg  = this.Message.createMT('mock_id')
    await msg.ready()

    setInterval(() => {
      log.verbose('PuppetMock', `start() setInterval() pretending received a new message: ${msg + ''}`)
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

  public async logout(): Promise<void> {
    log.verbose('PuppetMock', 'logout()')

    if (!this.logonoff()) {
      throw new Error('logout before login?')
    }

    this.emit('logout', this.userId!) // becore we will throw above by logonoff() when this.user===undefined
    this.userId = undefined

    // TODO: do the logout job
  }

  /**
   *
   * Contact
   *
   */
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

  public async contactRawPayload(id: string): Promise<MockContactRawPayload> {
    log.verbose('PuppetMock', 'contactRawPayload(%s)', id)
    const rawPayload: MockContactRawPayload = {
      name : 'mock name',
    }
    return rawPayload
  }

  public async contactRawPayloadParser(rawPayload: MockContactRawPayload): Promise<ContactPayload> {
    log.verbose('PuppetMock', 'contactRawPayloadParser(%s)', rawPayload)

    const payload: ContactPayload = {
      gender: Gender.Unknown,
      type:   ContactType.Unknown,
    }
    return payload
  }

  /**
   *
   * Message
   *
   */
  public async messageRawPayload(id: string): Promise<MockMessageRawPayload> {
    log.verbose('PuppetMock', 'messageRawPayload(%s)', id)
    const rawPayload: MockMessageRawPayload = {
      from : 'from_id',
      text : 'mock message text',
      to   : 'to_id',
    }
    return rawPayload
  }

  public async messageRawPayloadParser(rawPayload: MockMessageRawPayload): Promise<MessagePayload> {
    log.verbose('PuppetMock', 'messagePayload(%s)', rawPayload)
    const payload: MessagePayload = {
      date      : new Date(),
      direction : this.Message.Direction.MT,
      from      : this.Contact.load('xxx'),
      text      : 'mock message text',
      to        : this.userSelf(),
      type      : this.Message.Type.Text,
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

  /**
   *
   * Room
   *
   */
  public async roomRawPayload(
    id: string,
  ): Promise<MockRoomRawPayload> {
    log.verbose('PuppetMock', 'roomRawPayload(%s)', id)

    const rawPayload: MockRoomRawPayload = {
      owner      : 'mock_room_owner_id',
      topic      : 'mock topic',
      memberList : [],
    }
    return rawPayload
  }

  public async roomRawPayloadParser(
    rawPayload: MockRoomRawPayload,
  ): Promise<RoomPayload> {
    log.verbose('PuppetMock', 'roomRawPayloadParser(%s)', rawPayload)

    const payload: RoomPayload = {
      topic          : 'mock topic',
      memberList     : [],
      nameMap        : {} as any,
      roomAliasMap   : {} as any,
      contactAliasMap: {} as any,
    }

    return payload
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
    const r = this.Room.load('mock room id') as Room
    return r
  }

  public async roomQuit(room: Room): Promise<void> {
    log.verbose('PuppetMock', 'roomQuit(%s)', room)
  }

  /**
   *
   *
   * FriendRequest
   *
   */
  public async friendRequestSend(contact: Contact, hello: string): Promise<void> {
    log.verbose('PuppetMock', 'friendRequestSend(%s, %s)', contact, hello)
  }

  public async friendRequestAccept(contact: Contact, ticket: string): Promise<void> {
    log.verbose('PuppetMock', 'friendRequestAccept(%s, %s)', contact, ticket)
  }

}

export default PuppetMock
