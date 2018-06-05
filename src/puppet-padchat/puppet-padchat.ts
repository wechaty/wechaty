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

// import * as path  from 'path'
// import * as fs    from 'fs'
// import * as cuid from 'cuid'

import * as LRU from 'lru-cache'

import {
  FileBox,
}               from 'file-box'

import {
  MessagePayload,
  MessageType,

  // ContactQueryFilter,
  // ContactGender,
  // ContactType,
  ContactPayload,

  RoomPayload,
  // RoomQueryFilter,
  // RoomMemberQueryFilter,

  Puppet,
  PuppetOptions,
  Receiver,
  FriendRequestPayload,
}                       from '../puppet/'

import {
  PadchatPureFunctionHelper as pfHelper,
}                                         from './pure-function-helper'

import {
  log,
  qrCodeForChatie,
}                   from '../config'

import {
  WECHATY_PUPPET_PADCHAT_TOKEN,
  WECHATY_PUPPET_PADCHAT_ENDPOINT,
}                                   from './config'

import {
  Bridge,
  // resolverDict,
  // AutoDataType,
}                       from './bridge'

import {
  // PadchatPayload,
  PadchatContactPayload,
  PadchatMessagePayload,
  PadchatRoomPayload,

  // PadchatMessageType,
  // PadchatContinue,
  // PadchatMsgType,
  // PadchatStatus,
  // PadchatPayloadType,
  // PadchatRoomRawMember,
}                           from './padchat-schemas'

export type PuppetFoodType = 'scan' | 'ding'
export type ScanFoodType   = 'scan' | 'login' | 'logout'

export class PuppetPadchat extends Puppet {

  // private readonly cachePadchatContactPayload       : LRU.Cache<string, PadchatContactRawPayload>
  // private readonly cachePadchatFriendRequestRawPayload : LRU.Cache<string, FriendRequestRawPayload>
  private readonly cachePadchatMessagePayload       : LRU.Cache<string, PadchatMessagePayload>
  // private readonly cachePadchatRoomPayload          : LRU.Cache<string, PadchatRoomRawPayload>

  public readonly bridge:  Bridge

  constructor(
    public options: PuppetOptions,
  ) {
    super(options)

    const lruOptions: LRU.Options = {
      max: 1000,
      // length: function (n) { return n * 2},
      dispose: function (key: string, val: any) {
        log.silly('Puppet', 'constructor() lruOptions.dispose(%s, %s)', key, JSON.stringify(val))
      },
      maxAge: 1000 * 60 * 60,
    }

    // this.cachePadchatContactPayload       = new LRU<string, PadchatContactRawPayload>(lruOptions)
    // this.cacheFriendRequestPayload = new LRU<string, FriendRequestPayload>(lruOptions)
    this.cachePadchatMessagePayload       = new LRU<string, PadchatMessagePayload>(lruOptions)
    // this.cachePadchatRoomPayload          = new LRU<string, PadchatRoomRawPayload>(lruOptions)

    this.bridge = new Bridge({
      memory   : this.options.memory,
      token   : WECHATY_PUPPET_PADCHAT_TOKEN,
      endpoint: WECHATY_PUPPET_PADCHAT_ENDPOINT,
      autoData : {},
      // profile:  profile, // should be profile in the future
    })
  }

  public toString() {
    return `PuppetPadchat<${this.options.memory.name}>`
  }

  public ding(data?: any): Promise<string> {
    return data
  }

  public startWatchdog(): void {
    log.verbose('PuppetPadchat', 'initWatchdogForPuppet()')

    const puppet = this

    // clean the dog because this could be re-inited
    this.watchdog.removeAllListeners()

    puppet.on('watchdog', food => this.watchdog.feed(food))
    this.watchdog.on('feed', async food => {
      log.silly('PuppetPadchat', 'initWatchdogForPuppet() dog.on(feed, food={type=%s, data=%s})', food.type, food.data)
      // feed the dog, heartbeat the puppet.
      // puppet.emit('heartbeat', food.data)

      const feedAfterTenSeconds = async () => {
        this.bridge.WXHeartBeat()
        .then(() => {
          this.emit('watchdog', {
            data: 'WXHeartBeat()',
          })
        })
        .catch(e => {
          log.warn('PuppetPadchat', 'initWatchdogForPuppet() feedAfterTenSeconds rejected: %s', e && e.message || '')
        })
      }

      setTimeout(feedAfterTenSeconds, 15 * 1000)

    })

    // this.watchdog.on('reset', async (food, timeout) => {
    //   log.warn('PuppetPadchat', 'initWatchdogForPuppet() dog.on(reset) last food:%s, timeout:%s',
    //                         food.data, timeout)
    //   try {
    //     await this.stop()
    //     await this.start()
    //   } catch (e) {
    //     puppet.emit('error', e)
    //   }
    // })

    this.emit('watchdog', {
      data: 'inited',
    })

  }

  public async start(): Promise<void> {
    log.verbose('PuppetPadchat', `start() with ${this.options.memory.name}`)

    if (this.state.on()) {
      log.warn('PuppetPadchat', 'start() already on(pending)?')
      await this.state.ready('on')
      return
    }

    /**
     * state has two main state: ON / OFF
     * ON (pending)
     * OFF (pending)
     */
    this.state.on('pending')

    await this.startBridge()
    await this.startWatchdog()

    this.state.on(true)
    this.emit('start')

  }

  public async startBridge(): Promise<void> {
    log.verbose('PuppetPadchat', 'startBridge()')

    if (this.state.off()) {
      throw new Error('startBridge() state is off')
    }

    this.bridge.removeAllListeners()
    // this.bridge.on('ding'     , Event.onDing.bind(this))
    // this.bridge.on('error'    , e => this.emit('error', e))
    // this.bridge.on('log'      , Event.onLog.bind(this))
    this.bridge.on('login', (userId: string) => {
      this.bridge.syncContactsAndRooms()
      this.login(userId)
    })
    this.bridge.on('logout', () => {
      this.logout()
    })
    this.bridge.on('message', (messagePayload: PadchatMessagePayload) => {
      this.cachePadchatMessagePayload.set(
        messagePayload.msg_id,
        messagePayload,
      )
      this.emit('message', messagePayload.msg_id)
    })
    this.bridge.on('scan', (qrCode: string, status: number, data?: string) => {
      this.emit('scan', qrCode, status, data)
    })

    await this.bridge.start()
  }

  public async stop(): Promise<void> {
    log.verbose('PuppetPadchat', 'quit()')

    if (this.state.off()) {
      log.warn('PuppetPadchat', 'stop() is called on a OFF puppet. await ready(off) and return.')
      await this.state.ready('off')
      return
    }

    this.state.off('pending')

    this.watchdog.sleep()
    await this.logout()

    setImmediate(() => this.bridge.removeAllListeners())
    await this.bridge.stop()

    // await some tasks...
    this.state.off(true)
    this.emit('stop')
  }

  public async logout(): Promise<void> {
    log.verbose('PuppetPadchat', 'logout()')

    if (!this.id) {
      throw new Error('logout before login?')
    }

    this.emit('logout', this.id) // becore we will throw above by logonoff() when this.user===undefined
    this.id = undefined

    // TODO: this.bridge.logout
  }

  /**
   *
   * Contact
   *
   */
  public contactAlias(contactId: string)                      : Promise<string>
  public contactAlias(contactId: string, alias: string | null): Promise<void>

  public async contactAlias(contactId: string, alias?: string|null): Promise<void | string> {
    log.verbose('PuppetPadchat', 'contactAlias(%s, %s)', contactId, alias)

    if (typeof alias === 'undefined') {
      const payload = await this.contactPayload(contactId)
      return payload.alias || ''
    }

    await this.bridge.WXSetUserRemark(contactId, alias || '')

    return
  }

  public async contactList(): Promise<string[]> {
    log.verbose('PuppetPadchat', 'contactList()')

    const contactIdList = this.bridge.getContactIdList()

    return contactIdList
  }

  public async contactAvatar(contactId: string): Promise<FileBox> {
    log.verbose('PuppetPadchat', 'contactAvatar(%s)', contactId)

    const payload = await this.contactPayload(contactId)

    if (!payload.avatar) {
      throw new Error('no avatar')
    }

    const file = FileBox.fromUrl(payload.avatar)
    return file
  }

  public async contactRawPayload(contactId: string): Promise<PadchatContactPayload> {
    log.verbose('PuppetPadchat', 'contactRawPayload(%s)', contactId)

    const rawPayload = await this.bridge.contactRawPayload(contactId)
    return rawPayload
  }

  public async contactRawPayloadParser(rawPayload: PadchatContactPayload): Promise<ContactPayload> {
    log.verbose('PuppetPadchat', 'contactRawPayloadParser(rawPayload.user_name="%s")', rawPayload.user_name)

    const payload: ContactPayload = pfHelper.contactRawPayloadParser(rawPayload)
    return payload
  }

  /**
   *
   * Message
   *
   */

  public async messageFile(id: string): Promise<FileBox> {
    // const rawPayload = await this.messageRawPayload(id)

    // TODO

    const base64 = 'cRH9qeL3XyVnaXJkppBuH20tf5JlcG9uFX1lL2IvdHRRRS9kMMQxOPLKNYIzQQ=='
    const filename = 'test-' + id + '.txt'

    const file = FileBox.fromBase64(
      base64,
      filename,
    )

    return file
  }

  public async messageRawPayload(id: string): Promise<PadchatMessagePayload> {
    // throw Error('should not call messageRawPayload: ' + id)

    /**
     * Issue #1249
     */

    // this.cachePadchatMessageRawPayload.set(id, {
    //   id: 'xxx',
    //   data: 'xxx',
    // } as any)

    const rawPayload = this.cachePadchatMessagePayload.get(id)

    if (!rawPayload) {
      throw new Error('no rawPayload')
    }

    return rawPayload
  }

  public async messageRawPayloadParser(rawPayload: PadchatMessagePayload): Promise<MessagePayload> {
    log.warn('PuppetPadChat', 'messageRawPayloadParser(rawPayload.msg_id=%s)', rawPayload.msg_id)

    const payload: MessagePayload = pfHelper.messageRawPayloadParser(rawPayload)

    log.verbose('PuppetPadchat', 'messagePayload(%s)', JSON.stringify(payload))
    return payload
  }

  public async messageSendText(
    receiver : Receiver,
    text     : string,
  ): Promise<void> {
    log.verbose('PuppetPadchat', 'messageSend(%s, %s)', receiver, text)
    const id = receiver.contactId || receiver.roomId
    if (!id) {
      throw Error('No id')
    }
    await this.bridge.WXSendMsg(id, text)
  }

  public async messageSendFile(
    receiver : Receiver,
    file     : FileBox,
  ): Promise<void> {
    log.verbose('PuppetPadchat', 'messageSend("%s", %s)', JSON.stringify(receiver), file)

    const id = receiver.contactId || receiver.roomId
    if (!id) {
      throw new Error('no id!')
    }

    await this.bridge.WXSendImage(
      id,
      await file.toBase64(),
    )
  }

  public async messageForward(
    receiver  : Receiver,
    messageId : string,
  ): Promise<void> {
    log.verbose('PuppetPadchat', 'messageForward(%s, %s)',
                              JSON.stringify(receiver),
                              messageId,
              )
    const payload = await this.messagePayload(messageId)

    if (payload.type === MessageType.Text) {
      if (!payload.text) {
        throw new Error('no text')
      }
      await this.messageSendText(
        receiver,
        payload.text,
      )
    } else {
      await this.messageSendFile(
        receiver,
        await this.messageFile(messageId),
      )
    }
  }

  /**
   *
   * Room
   *
   */
  public async roomRawPayload(id: string): Promise<PadchatRoomPayload> {
    log.verbose('PuppetPadchat', 'roomRawPayload(%s)', id)

    const rawPayload = await this.bridge.roomRawPayload(id)
    return rawPayload
  }

  public async roomRawPayloadParser(rawPayload: PadchatRoomPayload): Promise<RoomPayload> {
    log.verbose('PuppetPadchat', 'roomRawPayloadParser(rawPayload.user_name="%s")', rawPayload.user_name)

    const roomRawMemberList = (await this.bridge.WXGetChatRoomMember(rawPayload.user_name)).member

    const payload: RoomPayload = pfHelper.roomRawPayloadParser(rawPayload, roomRawMemberList)

    return payload
  }

  public async roomList(): Promise<string[]> {
    log.verbose('PuppetPadchat', 'roomList()')

    const roomIdList = await this.bridge.getRoomIdList()
    log.silly('PuppetPadchat', 'roomList()=%d', roomIdList.length)

    return roomIdList
  }

  public async roomDel(
    roomId    : string,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetPadchat', 'roomDel(%s, %s)', roomId, contactId)

    // Should check whether user is in the room. WXDeleteChatRoomMember won't check if user in the room automatically
    await this.bridge.WXDeleteChatRoomMember(roomId, contactId)
  }

  public async roomAvatar(roomId: string): Promise<FileBox> {
    log.verbose('PuppetPadchat', 'roomAvatar(%s)', roomId)

    const payload = await this.roomPayload(roomId)

    if (payload.avatar) {
      return FileBox.fromUrl(payload.avatar)
    }
    log.warn('PuppetPadchat', 'roomAvatar() avatar not found, use the chatie default.')

    return qrCodeForChatie()
  }

  public async roomAdd(
    roomId    : string,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetPadchat', 'roomAdd(%s, %s)', roomId, contactId)
    await this.bridge.WXAddChatRoomMember(roomId, contactId)
  }

  public async roomTopic(
    roomId: string,
    topic?: string,
  ): Promise<void | string> {
    log.verbose('PuppetPadchat', 'roomTopic(%s, %s)', roomId, topic)

    if (typeof topic === 'undefined') {
      const payload = await this.roomPayload(roomId)
      return payload.topic
    }

    await this.bridge.WXSetChatroomName(roomId, topic)

    return
  }

  public async roomCreate(
    contactIdList : string[],
    topic         : string,
  ): Promise<string> {
    log.verbose('PuppetPadchat', 'roomCreate(%s, %s)', contactIdList, topic)

    // TODO
    // await this.bridge.crea
    return 'mock_room_id'
  }

  public async roomQuit(roomId: string): Promise<void> {
    log.verbose('PuppetPadchat', 'roomQuit(%s)', roomId)
    await this.bridge.WXQuitChatRoom(roomId)
  }

  /**
   *
   * FriendRequest
   *
   */
  public async friendRequestSend(
    contactId : string,
    hello     : string,
  ): Promise<void> {
    log.verbose('PuppetPadchat', 'friendRequestSend(%s, %s)', contactId, hello)

    const rawPayload = await this.contactRawPayload(contactId)

    let strangerV1
    let strangerV2
    if (pfHelper.isStrangerV1(rawPayload.stranger)) { // /^v1_/i.test(rawPayload.stranger)) {
      strangerV1 = rawPayload.stranger
    } else if (pfHelper.isStrangerV2(rawPayload.stranger)) { // /^v2_/i.test(rawPayload.stranger)) {
      strangerV2 = rawPayload.stranger
    } else {
      throw new Error('stranger neither v1 nor v2!')
    }

    // Issue #1252 : what's wrong here?

    await this.bridge.WXAddUser(
      strangerV1 || '',
      strangerV2 || '',
      '14',
      hello,
    )
  }

  public async friendRequestAccept(
    contactId : string,
    ticket    : string,
  ): Promise<void> {
    log.verbose('PuppetPadchat', 'friendRequestAccept(%s, %s)', contactId, ticket)

    // TODO

    // const rawPayload = await this.contactRawPayload(contactId)

    // if (!rawPayload.ticket) {
    //   throw new Error('no ticket')
    // }

    // await this.bridge.WXAcceptUser(
    //   rawPayload.stranger,
    //   rawPayload.ticket,
    // )
  }

  public async friendRequestRawPayloadParser(rawPayload: any) : Promise<FriendRequestPayload> {
    log.verbose('PuppetPadchat', 'friendRequestRawPayloadParser(%s)', rawPayload)

    const payload: FriendRequestPayload = pfHelper.friendRequestRawPayloadParser(rawPayload)
    return payload
  }

  public async friendRequestRawPayload(id: string): Promise<any> {
    // log.verbose('PuppetPadchat', 'friendRequestRawPayload(%s)', id)

    throw new Error('todo: ' + id)
    // const rawPayload = this.cacheMessageRawPayload.get(id)
    // if (!rawPayload) {
    //   throw new Error('no rawPayload')
    // }

    // return rawPayload
  }

}

export default PuppetPadchat
