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
  ContactGender,
  ContactType,
  ContactPayload,

  RoomPayload,
  // RoomQueryFilter,
  // RoomMemberQueryFilter,

  Puppet,
  PuppetOptions,
  Receiver,
  FriendRequestPayload,
}                       from '../puppet/'

import Misc           from '../misc'

import {
  log,
}                       from '../config'

import {
  WECHATY_PUPPET_PADCHAT_TOKEN,
  WECHATY_PUPPET_PADCHAT_ENDPOINT,
}                                   from './config'

import {
  Bridge,
  resolverDict,
  // AutoDataType,
}                       from './bridge'

import {
  PadchatPayload,
  PadchatContactPayload,
  PadchatMessagePayload,
  PadchatRoomPayload,

  PadchatMessageType,
  PadchatContinue,
  PadchatMsgType,
  PadchatStatus,
  // PadchatRoomRawMember,
}                           from './padchat-schemas'

export type PuppetFoodType = 'scan' | 'ding'
export type ScanFoodType   = 'scan' | 'login' | 'logout'

export class PuppetPadchat extends Puppet {

  public readonly cachePadchatContactPayload       : LRU.Cache<string, PadchatContactPayload>
  // public readonly cachePadchatFriendRequestRawPayload : LRU.Cache<string, FriendRequestRawPayload>
  public readonly cachePadchatMessagePayload       : LRU.Cache<string, PadchatMessagePayload>
  public readonly cachePadchatRoomPayload          : LRU.Cache<string, PadchatRoomPayload>

  public bridge:  Bridge
  // public botWs:   WebSocket

  constructor(
    public options: PuppetOptions,
  ) {
    super(options)

    const lruOptions: LRU.Options = {
      max: 1000,
      // length: function (n) { return n * 2},
      dispose: function (key: string, val: Object) {
        log.silly('Puppet', 'constructor() lruOptions.dispose(%s, %s)', key, JSON.stringify(val))
      },
      maxAge: 1000 * 60 * 60,
    }

    this.cachePadchatContactPayload       = new LRU<string, PadchatContactPayload>(lruOptions)
    // this.cacheFriendRequestPayload = new LRU<string, FriendRequestPayload>(lruOptions)
    this.cachePadchatMessagePayload       = new LRU<string, PadchatMessagePayload>(lruOptions)
    this.cachePadchatRoomPayload          = new LRU<string, PadchatRoomPayload>(lruOptions)

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

    this.watchdog.on('reset', async (food, timeout) => {
      log.warn('PuppetPadchat', 'initWatchdogForPuppet() dog.on(reset) last food:%s, timeout:%s',
                            food.data, timeout)
      try {
        await this.stop()
        await this.start()
      } catch (e) {
        puppet.emit('error', e)
      }
    })

    this.emit('watchdog', {
      data: 'inited',
    })

  }

  public async start(): Promise<void> {
    log.verbose('PuppetPadchat', `start() with ${this.options.memory.name}`)

    /**
     * state has two main state: ON / OFF
     * ON (pending)
     * OFF (pending)
     */
    this.state.on('pending')

    await this.startBridge()
    await this.startWatchdog()

    this.state.on(true)
    // this.emit('start')

  }

  public async startBridge(): Promise<void> {
    log.verbose('PuppetPadchat', 'startBridge()')

    if (this.state.off()) {
      const e = new Error('initBridge() found targetState != live, no init anymore')
      log.warn('PuppetPadchat', e.message)
      throw e
    }

    this.bridge.removeAllListeners()
    // this.bridge.on('ding'     , Event.onDing.bind(this))
    // this.bridge.on('error'    , e => this.emit('error', e))
    // this.bridge.on('log'      , Event.onLog.bind(this))
    this.bridge.on('login'    , (userId: string) => {
      this.login(userId)
      this.bridge.syncContactsAndRooms()
    })
    this.bridge.on('ws', (data: string) => {
      const payload: PadchatPayload = JSON.parse(data)
      this.wsOnMessage(payload)
    })

    // this.bridge.on('logout'   , Event.onLogout.bind(this))
    // this.bridge.on('message'  , Event.onMessage.bind(this))
    this.bridge.on('scan', (qrCode, statusCode, data) => {
      this.emit('scan', qrCode, statusCode, data)
    })
    // this.bridge.on('unload'   , Event.onUnload.bind(this))

    await this.bridge.start()
  }

  private async wsOnMessage(payload: PadchatPayload) {
    // if (typeof data !== 'string') {
    //   const e = new Error('Ipad Websocket return wrong data!')
    //   log.warn('PuppetPadchat', e.message)
    //   throw e
    // }
    // const payload: PadchatPayload = JSON.parse(data)

    if (  payload.continue   === PadchatContinue.Stop
        && payload.msg_type  === PadchatMsgType.N15_32768
        && payload.status    === PadchatStatus.One
    ) {
      // "continue":0,"msg_type":32768,"status":1,"
    }
    log.silly('PuppetPadchat', 'WebSocket Server result: %s', JSON.stringify(payload))

    // Data From Tencent
    if (!payload.msgId) {
      // rawWebSocketData:
      // {
      //   "apiName": "",
      //   "data": "XXXX",
      //   "msgId": "",
      //   "userId": "test"
      // }
      if (!payload.data && !payload.apiName) {
        log.silly('PuppetPadchat', 'WebSocket Server get empty message data form Tencent server')
        return
      }

      const msgRawPayloadList: PadchatMessagePayload[] = JSON.parse(decodeURIComponent(payload.data))

      msgRawPayloadList.forEach(async (msgRawPayload) => {
        log.silly('PuppetPadchat', 'WebSocket Server rawData result: %s', JSON.stringify(msgRawPayload))
        if (!msgRawPayload.msg_id) {
          log.silly('PuppetPadchat', 'WebSocket Server: get empty message msg_id form Tencent server for payoad: %s',
                                      JSON.stringify(msgRawPayload),
                    )
          return
        }

        // const msg  = this.Message.create(
        //   msgRawPayload['msg_id'],
        //   await this.messagePayload(msgRawPayload.msg_id),
        // )
        // await msg.ready()

        this.cachePadchatMessagePayload.set(msgRawPayload.msg_id, msgRawPayload)

        this.emit('message', msgRawPayload.msg_id)
      })

    // Data Return From WebSocket Client
    } else {
      // check logout:
      if (payload.type === -1) {
        // this.emit('logout', this.selfId())
        this.logout() // no need to await
      }

      log.silly('PuppetPadchat', 'return apiName: %s, msgId: %s', payload.apiName, payload.msgId)
      const msgId = payload.msgId

      let rawData: Object
      if (!payload.data) {
        log.silly('PuppetPadchat', 'WebSocket Server get empty message data form API call: %s', payload.apiName)
        rawData = {}
      } else {
        rawData = JSON.parse(decodeURIComponent(payload.data))
      }

      // rawWebSocketData:
      // {
      //     "apiName": "WXHeartBeat",
      //     "data": "%7B%22status%22%3A0%2C%22message%22%3A%22ok%22%7D",
      //     "msgId": "abc231923912983",
      //     "userId": "test"
      // }

      if (resolverDict[msgId]) {
        const resolve = resolverDict[msgId]
        delete resolverDict[msgId]
        // resolve({rawData: rawData, msgId: rawWebSocketData.msgId})
        resolve(rawData)
      } else {
        log.warn('PuppetPadchat', 'wsOnMessage() msgId %s not in resolverDict', msgId)
      }
    }
  }

  public async stop(): Promise<void> {
    log.verbose('PuppetPadchat', 'quit()')

    if (this.state.off()) {
      log.warn('PuppetPadchat', 'quit() is called on a OFF puppet. await ready(off) and return.')
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

    // this.emit('stop')
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

  // public async contactFindAll(query: ContactQueryFilter): Promise<string[]> {
  public async contactList(): Promise<string[]> {
    log.verbose('PuppetPadchat', 'contactList()')

    // const contactRawPayloadMap = (await this.bridge.checkSyncContactOrRoom()).contactMap

    const contactIdList = this.bridge.getContactIdList()
    // for (const contactRawPayload in contactRawPayloadMap) {

    // }

    // contactRawPayloadMap.forEach((value , id) => {
    //   contactIdList.push(id)
    //   this.Contact.load(
    //     id,
    //     await this.contactRawPayloadParser(value),
    //   )
    // })

    // // const payloadList = await Promise.all(
    // //   contactIdList.map(
    // //     id => this.contactPayload(id),
    // //   ),
    // // )

    // const contactList = contactIdList.filter(id => {
    //   await this.contactPayload(id)
    //   return true
    // })
    return contactIdList
  }

  // protected contactQueryFilterToFunction(
  //   query: ContactQueryFilter,
  // ): (payload: ContactPayload) => boolean {
  //   log.verbose('PuppetPadchat', 'contactQueryFilterToFunctionString({ %s })',
  //                           Object.keys(query)
  //                                 .map(k => `${k}: ${query[k as keyof ContactQueryFilter]}`)
  //                                 .join(', '),
  //             )

  //   if (Object.keys(query).length !== 1) {
  //     throw new Error('query only support one key. multi key support is not availble now.')
  //   }

  //   const filterKey = Object.keys(query)[0] as keyof ContactQueryFilter

  //   let filterValue: string | RegExp | undefined  = query[filterKey]
  //   if (!filterValue) {
  //     throw new Error('filterValue not found')
  //   }

  //   /**
  //    * must be string because we need inject variable value
  //    * into code as variable namespecialContactList
  //    */
  //   let filterFunction: (payload: ContactPayload) => boolean

  //   if (filterValue instanceof RegExp) {
  //     const regex = filterValue
  //     filterFunction = (payload: ContactPayload) => regex.test(payload[filterKey] || '')
  //   } else if (typeof filterValue === 'string') {
  //     filterValue = filterValue.replace(/'/g, '\\\'')
  //     filterFunction = (payload: ContactPayload) => payload[filterKey] === filterValue
  //   } else {
  //     throw new Error('unsupport name type')
  //   }

  //   return filterFunction
  // }

  public async contactAvatar(contactId: string): Promise<FileBox> {
    log.verbose('PuppetPadchat', 'contactAvatar(%s)', contactId)

    const payload = await this.contactPayload(contactId)

    if (!payload.avatar) {
      throw new Error('no avatar')
    }

    const file = FileBox.fromRemote(payload.avatar)
    return file
  }

  public async contactRawPayload(id: string): Promise<PadchatContactPayload> {
    log.verbose('PuppetPadchat', 'contactRawPayload(%s)', id)

    const rawPayload = await Misc.retry(async (retry, attempt) => {
      log.verbose('PuppetPadchat', 'contactRawPayload(%s) retry() attempt=%d', id, attempt)

      let tryRawPayload = this.bridge.cachePadchatContactPayload[id]
      if (!tryRawPayload) {
        tryRawPayload =  await this.bridge.WXGetContactPayload(id)
        if (tryRawPayload) {
          this.bridge.cachePadchatContactPayload[id] = tryRawPayload
        }
      }

      if (tryRawPayload) {
        return tryRawPayload
      } else {
        return retry(new Error('tryRawPayload empty'))
      }
    })

    if (!rawPayload) {
      throw new Error('no rawPayload')
    }

    return rawPayload
  }

  public async contactRawPayloadParser(rawPayload: PadchatContactPayload): Promise<ContactPayload> {
    log.verbose('PuppetPadchat', 'contactRawPayloadParser(%s)', rawPayload)

    if (!rawPayload.user_name) {
      throw Error('cannot get user_name(wxid)!')
    }

    const gender = {
      0: ContactGender.Unknown,
      1: ContactGender.Male,
      2: ContactGender.Female,
    }

    if (/@chatroom$/.test(rawPayload.user_name)) {
      throw Error('Room Object instead of Contact!')
    }

    let contactType = ContactType.Unknown
    if (/^gh_/.test(rawPayload.user_name)) {
      contactType = ContactType.Official
    } else {
      contactType = ContactType.Personal
    }

    const payload: ContactPayload = {
      id        : rawPayload.user_name,
      gender    : gender[rawPayload.sex],
      type      : contactType,
      alias     : rawPayload.remark,
      avatar    : rawPayload.big_head,
      city      : rawPayload.city,
      name      : rawPayload.nick_name,
      province  : rawPayload.provincia,
      signature : (rawPayload.signature).replace('+', ' '),   // Stay+Foolish
    }
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

    // log.verbose('PuppetPadchat', 'messageRawPayload(%s)', id)
    // const rawPayload: PadchatMessageRawPayload = {
    //   content:      '',
    //   data:         '',
    //   continue:     1,
    //   description:  '',
    //   from_user:    '',
    //   msg_id:       '',
    //   msg_source:   '',
    //   msg_type:     5,
    //   status:       1,
    //   sub_type:     PadchatMessageType.TEXT,
    //   timestamp:    11111111,
    //   to_user:      '',
    //   uin:          111111,

    //   // from : 'from_id',
    //   // text : 'padchat message text',
    //   // to   : 'to_id',
    // }
    // return rawPayload
  }

  public async messageRawPayloadParser(rawPayload: PadchatMessagePayload): Promise<MessagePayload> {
    log.warn('PuppetPadChat', 'messageRawPayloadParser(rawPayload.msg_id=%s)', rawPayload.msg_id)

    let type: MessageType

    switch (rawPayload.sub_type) {
      case PadchatMessageType.Text:
        type = MessageType.Text
        break
      case PadchatMessageType.Image:
        type = MessageType.Image
        break
      case PadchatMessageType.Voice:
        type = MessageType.Audio
        break
      case PadchatMessageType.Emoticon:
        type = MessageType.Emoticon
        break
      case PadchatMessageType.App:
        type = MessageType.Attachment
        break
      case PadchatMessageType.Video:
        type = MessageType.Video
        break
      default:
        log.warn('PuppetPadChat', 'messageRawPayloadParser() unknown type %s[%s], treat as Text',
                                  PadchatMessageType[rawPayload.sub_type],
                                  rawPayload.sub_type,
                )
        type = MessageType.Text
    }

    const payload: MessagePayload = {
      id        : rawPayload.msg_id,
      timestamp : Date.now(),
      fromId    : rawPayload.from_user,
      text      : rawPayload.content,
      toId      : rawPayload.to_user,
      type      : type,
    }

    if (/@chatroom$/.test(rawPayload.from_user)) {
      payload.roomId = rawPayload.from_user
      payload.fromId = rawPayload.content.split(':\n')[0]
      payload.text = rawPayload.content.split(':\n')[1]

      if (!payload.roomId || !payload.fromId) {
        throw Error('empty roomId or empty contactId!')
      }
      // const room = this.Room.load(payload.roomId)
      // const contact = this.Contact.load(payload.fromId)
      // await room.ready()
      // await contact.ready()
    } else {
      if (!payload.fromId) {
        throw Error('empty contactId!')
      }
      // const contact = this.Contact.load(payload.fromId)
      // await contact.ready()
    }

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
    log.verbose('PuppetPadchat', 'messageSend(%s, %s)', receiver, file)

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
                              receiver,
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

    const rawPayload = await Misc.retry(async (retry, attempt) => {
      log.silly('PuppetPadchat', 'roomRawPayload(%s) retry() attempt=%d', id, attempt)

      let tryRawPayload = this.bridge.cachePadchatRoomPayload[id]
      if (!tryRawPayload) {
        tryRawPayload = await this.bridge.WXGetRoomPayload(id)
        if (tryRawPayload) {
          this.bridge.cachePadchatRoomPayload[id] = tryRawPayload
        }
      }

      if (tryRawPayload) {
        return tryRawPayload
      } else {
        return retry(new Error('tryRawPayload empty'))
      }
    })

    if (!rawPayload) {
      throw new Error('no rawPayload')
    }
    return rawPayload
  }

  public async roomRawPayloadParser(rawPayload: PadchatRoomPayload): Promise<RoomPayload> {
    log.verbose('PuppetPadchat', 'roomRawPayloadParser(%s)', rawPayload.user_name)

    // const memberList = (rawPayload.member || [])
    //                     .map(id => this.Contact.load(id))

    // await Promise.all(memberList.map(c => c.ready()))

    const padchatRoomRawMemberList = (await this.bridge.WXGetChatRoomMember(rawPayload.user_name)).member

    const aliasDict = {} as { [id: string]: string | undefined }

    if (Array.isArray(padchatRoomRawMemberList)) {
      padchatRoomRawMemberList.forEach(
        rawMember => {
          aliasDict[rawMember.user_name] = rawMember.chatroom_nick_name
        },
      )
    }

    const payload: RoomPayload = {
      id           : rawPayload.user_name,
      topic        : rawPayload.nick_name,
      memberIdList : rawPayload.member,
      aliasDict,
    }

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
    if (/^v1_/i.test(rawPayload.stranger)) {
      strangerV1 = rawPayload.stranger
    } else if (/^v2_/i.test(rawPayload.stranger)) {
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

    // TODO

    return rawPayload
    // switch (rawPayload.MsgType) {
    //   case WebMessageType.VERIFYMSG:
    //     if (!rawPayload.RecommendInfo) {
    //       throw new Error('no RecommendInfo')
    //     }
    //     const recommendInfo: WebRecomendInfo = rawPayload.RecommendInfo

    //     if (!recommendInfo) {
    //       throw new Error('no recommendInfo')
    //     }

    //     const payloadReceive: FriendRequestPayloadReceive = {
    //       id        : rawPayload.MsgId,
    //       contactId : recommendInfo.UserName,
    //       hello     : recommendInfo.Content,
    //       ticket    : recommendInfo.Ticket,
    //       type      : FriendRequestType.Receive,
    //     }
    //     return payloadReceive

    //   case WebMessageType.SYS:
    //     const payloadConfirm: FriendRequestPayloadConfirm = {
    //       id        : rawPayload.MsgId,
    //       contactId : rawPayload.FromUserName,
    //       type      : FriendRequestType.Confirm,
    //     }
    //     return payloadConfirm

    //   default:
    //     throw new Error('not supported friend request message raw payload')
    // }
  }

  public async friendRequestRawPayload(id: string): Promise<any> {
    // log.verbose('PuppetPadchat', 'friendRequestRawPayload(%s)', id)

    // TODO

    console.log(id)
    // const rawPayload = this.cacheMessageRawPayload.get(id)
    // if (!rawPayload) {
    //   throw new Error('no rawPayload')
    // }

    // return rawPayload
  }

}

export default PuppetPadchat
