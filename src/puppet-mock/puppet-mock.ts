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
  MessagePayload,

  // ContactQueryFilter,
  ContactGender,
  ContactType,
  ContactPayload,

  FriendRequestPayload,

  RoomPayload,
  // RoomQueryFilter,
}                       from '../puppet/'
import {
  Puppet,
  PuppetOptions,
  Receiver,
  MessageType,
}                       from '../puppet/'

import {
  log,
  qrCodeForChatie,
}                       from '../config'

export type PuppetFoodType = 'scan' | 'ding'
export type ScanFoodType   = 'scan' | 'login' | 'logout'

export interface MockContactRawPayload {
  name : string,
}

export interface MockMessageRawPayload {
  id   : string,
  from : string,
  to   : string,
  text : string
}

export interface MockRoomRawPayload {
  topic      : string,
  memberList : string[],
  ownerId    : string,
}

export class PuppetMock extends Puppet {

  constructor(
    public options: PuppetOptions,
  ) {
    super(options)
  }

  public async start(): Promise<void> {
    log.verbose('PuppetMock', `start() with ${this.options.memory.name}`)

    this.state.on('pending')
    // await some tasks...
    this.state.on(true)

    this.id = 'logined_user_id'
    // const user = this.Contact.load(this.id)
    this.emit('login', this.id)

    const MOCK_MSG_ID = 'mockid'
    this.cacheMessagePayload.set(MOCK_MSG_ID, {
      id        : MOCK_MSG_ID,
      type      : MessageType.Text,
      text      : 'mock text',
      timestamp : Date.now(),
      fromId    : 'xxx',
      toId      : 'xxx',
    })

    setInterval(() => {
      log.verbose('PuppetMock', `start() setInterval() pretending received a new message: ${MOCK_MSG_ID}`)
      this.emit('message', MOCK_MSG_ID)
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

    if (!this.id) {
      throw new Error('logout before login?')
    }

    this.emit('logout', this.id) // becore we will throw above by logonoff() when this.user===undefined
    this.id = undefined

    // TODO: do the logout job
  }

  /**
   *
   * Contact
   *
   */
  public contactAlias(contactId: string)                      : Promise<string>
  public contactAlias(contactId: string, alias: string | null): Promise<void>

  public async contactAlias(contactId: string, alias?: string|null): Promise<void | string> {
    log.verbose('PuppetMock', 'contactAlias(%s, %s)', contactId, alias)

    if (typeof alias === 'undefined') {
      return 'mock alias'
    }
    return
  }

  public async contactList(): Promise<string[]> {
    log.verbose('PuppetMock', 'contactList()')

    return []
  }

  public async contactAvatar(contactId: string): Promise<FileBox> {
    log.verbose('PuppetMock', 'contactAvatar(%s)', contactId)

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
      id     : 'id',
      gender : ContactGender.Unknown,
      type   : ContactType.Unknown,
    }
    return payload
  }

  /**
   *
   * Message
   *
   */
  public async messageFile(id: string): Promise<FileBox> {
    return FileBox.fromBase64(
      'cRH9qeL3XyVnaXJkppBuH20tf5JlcG9uFX1lL2IvdHRRRS9kMMQxOPLKNYIzQQ==',
      'mock-file' + id + '.txt',
    )
  }

  public async messageRawPayload(id: string): Promise<MockMessageRawPayload> {
    log.verbose('PuppetMock', 'messageRawPayload(%s)', id)
    const rawPayload: MockMessageRawPayload = {
      id   : 'id',
      from : 'from_id',
      text : 'mock message text',
      to   : 'to_id',
    }
    return rawPayload
  }

  public async messageRawPayloadParser(rawPayload: MockMessageRawPayload): Promise<MessagePayload> {
    log.verbose('PuppetMock', 'messagePayload(%s)', rawPayload)
    const payload: MessagePayload = {
      id        : rawPayload.id,
      timestamp : Date.now(),
      fromId    : 'xxx',
      text      : 'mock message text',
      toId      : this.selfId(),
      type      : MessageType.Text,
    }
    return payload
  }

  public async messageSendText(
    receiver : Receiver,
    text     : string,
  ): Promise<void> {
    log.verbose('PuppetMock', 'messageSend(%s, %s)', receiver, text)
  }

  public async messageSendFile(
    receiver : Receiver,
    file     : FileBox,
  ): Promise<void> {
    log.verbose('PuppetMock', 'messageSend(%s, %s)', receiver, file)
  }

  public async messageForward(
    receiver  : Receiver,
    messageId : string,
  ): Promise<void> {
    log.verbose('PuppetMock', 'messageForward(%s, %s)',
                              receiver,
                              messageId,
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
      ownerId      : 'mock_room_owner_id',
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
      id           : 'id',
      topic        : 'mock topic',
      memberIdList : [],
      aliasDict    : {},
    }

    return payload
  }

  public async roomList(): Promise<string[]> {
    log.verbose('PuppetMock', 'roomList()')

    return []
  }

  public async roomDel(
    roomId    : string,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetMock', 'roomDel(%s, %s)', roomId, contactId)
  }

  public async roomAvatar(roomId: string): Promise<FileBox> {
    log.verbose('PuppetMock', 'roomAvatar(%s)', roomId)

    const payload = await this.roomPayload(roomId)

    if (payload.avatar) {
      return FileBox.fromUrl(payload.avatar)
    }
    log.warn('PuppetMock', 'roomAvatar() avatar not found, use the chatie default.')
    return qrCodeForChatie()
  }

  public async roomAdd(
    roomId    : string,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetMock', 'roomAdd(%s, %s)', roomId, contactId)
  }

  public async roomTopic(
    roomId: string,
    topic?: string,
  ): Promise<void | string> {
    log.verbose('PuppetMock', 'roomTopic(%s, %s)', roomId, topic)

    if (typeof topic === 'undefined') {
      return 'mock room topic'
    }
    return
  }

  public async roomCreate(
    contactIdList : string[],
    topic         : string,
  ): Promise<string> {
    log.verbose('PuppetMock', 'roomCreate(%s, %s)', contactIdList, topic)

    return 'mock_room_id'
  }

  public async roomQuit(roomId: string): Promise<void> {
    log.verbose('PuppetMock', 'roomQuit(%s)', roomId)
  }

  /**
   *
   * FriendRequest
   *
   */
  public async friendRequestRawPayload(id: string)            : Promise<any> {
    return {id} as any
  }
  public async friendRequestRawPayloadParser(rawPayload: any) : Promise<FriendRequestPayload> {
    return rawPayload
  }

  public async friendRequestSend(
    contactId : string,
    hello     : string,
  ): Promise<void> {
    log.verbose('PuppetMock', 'friendRequestSend(%s, %s)', contactId, hello)
  }

  public async friendRequestAccept(
    contactId : string,
    ticket    : string,
  ): Promise<void> {
    log.verbose('PuppetMock', 'friendRequestAccept(%s, %s)', contactId, ticket)
  }

  public ding(data?: any): Promise<string> {
    return data
  }

}

export default PuppetMock
