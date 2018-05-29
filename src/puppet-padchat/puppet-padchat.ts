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
// import * as fs    from 'fs'

import {
  FileBox,
}             from 'file-box'

import {
  // Message,
  MessagePayload, MessageType,
}                       from '../message'

import {
  Contact,
  ContactQueryFilter,
  Gender,
  ContactType,
  ContactPayload,
}                       from '../contact'

import {
  // Room,
  RoomPayload,
  RoomQueryFilter,
}                       from '../room'

// import {
//   FriendRequest,
// }                       from '../puppet/friend-request'

import {
  Puppet,
  PuppetOptions,
  Receiver,
}                       from '../puppet/'

import {
  log,
}                       from '../config'

// import {
//   Profile,
// }                       from '../profile'

import {
  ADDRESS,
}                       from './config'

import {
  Bridge,
  resolverDict,
  AutoDataType,
}                       from './bridge'

import {
  PadchatContactRawPayload,
  PadchatMessageRawPayload,
  PadchatMessageType,
  PadchatRoomRawPayload,
}                       from './padchat-schemas'

export type PuppetFoodType = 'scan' | 'ding'
export type ScanFoodType   = 'scan' | 'login' | 'logout'

export interface RawWebSocketDataType {
  apiName: string, // raw function name
  data:    string,
  msgId:   string,
  userId:  string, // token
}

import * as WebSocket from 'ws'

// Mock userid
const TOKEN = 'padchattest'

export class PuppetPadchat extends Puppet {
  public bridge:  Bridge
  public botWs:   WebSocket

  constructor(
    public options: PuppetOptions,
  ) {
    super(options)

    this.botWs  = new WebSocket(ADDRESS, { perMessageDeflate: true })

    this.bridge = new Bridge({
      userId   : TOKEN,
      botWs    : this.botWs,
      autoData : {},
      // profile:  profile, // should be profile in the future
    })

    this.botWs.on('message', data => this.wsOnMessage(data))

  }

  public toString() {
    return `PuppetPadchat<${this.options.profile.name}>`
  }

  public ding(data?: any): Promise<string> {
    return data
  }

  // public initWatchdog(): void {
  //   log.verbose('PuppetPadchat', 'initWatchdogForPuppet()')

  //   const puppet = this

  //   // clean the dog because this could be re-inited
  //   this.watchdog.removeAllListeners()

  //   puppet.on('watchdog', food => this.watchdog.feed(food))
  //   this.watchdog.on('feed', food => {
  //     log.silly('PuppetPadchat', 'initWatchdogForPuppet() dog.on(feed, food={type=%s, data=%s})', food.type, food.data)
  //     // feed the dog, heartbeat the puppet.
  //     puppet.emit('heartbeat', food.data)
  //   })

  //   this.watchdog.on('reset', async (food, timeout) => {
  //     log.warn('PuppetPadchat', 'initWatchdogForPuppet() dog.on(reset) last food:%s, timeout:%s',
  //                           food.data, timeout)
  //     try {
  //       await this.stop()
  //       await this.start()
  //     } catch (e) {
  //       puppet.emit('error', e)
  //     }
  //   })
  // }

  public async start(): Promise<void> {
    // Connect with websocket server
    const botWs = this.botWs

    const bridge = this.bridge = await this.initBridge()

    if (!this.bridge) {
      throw Error('cannot init bridge successfully!')
    }

    this.bridge.loginSucceed = false

    log.verbose('PuppetPadchat', `start() with ${this.options.profile}`)
    this.state.on('pending')

    botWs.on('open', async() => {
      // await some tasks...
      await bridge.init()
      await bridge.WXInitialize()

      // Check for 62 data, if has, then use WXLoadWxDat
      if (bridge.autoData && bridge.autoData.wxData) {
        log.info('PuppetPadchat', `start, get 62 data`)
        // bridge.WXLoadWxDat(bridge.autoData.wxData)
        await bridge.WXLoadWxDat(bridge.autoData.wxData)
      }

      if (bridge.autoData && bridge.autoData.token) {
        log.info('PuppetPadchat', `get ${bridge.autoData.nick_name || 'no nick_name'} token`)

        // Offline, then relogin
        log.info('PuppetPadchat', `offline, trying to relogin`)
        await bridge.WXAutoLogin(bridge.autoData.token)
      } else {
        await bridge.WXGetQRCode()
      }

      this.checkLogin()
    })
  }

  public checkLogin() {
    log.silly('PuppetPadchat', `checkLogin`)

    if (!this.bridge) {
      throw Error('cannot init bridge successfully!')
    }

    if (this.bridge.loginSucceed === true) {
      log.silly('PuppetPadchat', `checkLogin, login successfully`)
      this.loginSucceed()
      return
    } else {
      log.silly('PuppetPadchat', `checkLogin, not login yet`)
      setTimeout(() => {
        this.checkLogin()
      }, 2000)
      return
    }
  }

  public async initBridge(): Promise<Bridge> {
    log.verbose('PuppetPadchat', 'initBridge()')
    // if (this.state.off()) {
    //   const e = new Error('initBridge() found targetState != live, no init anymore')
    //   log.warn('PuppetPadchat', e.message)
    //   throw e
    // }

    const autoData: AutoDataType = await this.options.profile.get('autoData')
    log.silly('PuppetPadchat', 'initBridge, get autoData: %s', JSON.stringify(autoData))
    this.bridge.autoData = autoData

    // this.bridge.on('ding'     , Event.onDing.bind(this))
    // this.bridge.on('error'    , e => this.emit('error', e))
    // this.bridge.on('log'      , Event.onLog.bind(this))
    // this.bridge.on('login'    , Event.onLogin.bind(this))
    // this.bridge.on('logout'   , Event.onLogout.bind(this))
    // this.bridge.on('message'  , Event.onMessage.bind(this))
    // this.bridge.on('scan'     , Event.onScan.bind(this))
    // this.bridge.on('unload'   , Event.onUnload.bind(this))

    return this.bridge
  }

  private async wsOnMessage(data: WebSocket.Data) {
    if (typeof data !== 'string') {
      const e = new Error('Ipad Websocket return wrong data!')
      log.warn('PuppetPadchat', e.message)
      throw e
    }

    const rawWebSocketData = JSON.parse(data) as RawWebSocketDataType

    // Data From Tencent
    if (rawWebSocketData.msgId === '') {
      log.silly('PuppetPadchat', 'WebSocket Server result: %s', JSON.stringify(rawWebSocketData))
      // rawWebSocketData:
      // {
      //   "apiName": "",
      //   "data": "XXXX",
      //   "msgId": "",
      //   "userId": "test"
      // }
      if (!rawWebSocketData.data) {
        log.silly('PuppetPadchat', 'WebSocket Server get empty message data form Tencent server')
        return
      }

      const msgRawPayloadList: PadchatMessageRawPayload[] = JSON.parse(decodeURIComponent(rawWebSocketData.data))

      msgRawPayloadList.forEach(async (msgRawPayload) => {
        log.silly('PuppetPadchat', 'WebSocket Server rawData result: %s', JSON.stringify(msgRawPayload))
        if (!msgRawPayload['msg_id']) {
          log.silly('PuppetPadchat', 'WebSocket Server: get empty message msg_id form Tencent server')
          return
        }

        const msg  = this.Message.create(msgRawPayload['msg_id'], await this.messageRawPayloadParser(msgRawPayload))
        await msg.ready()

        this.emit('message', msg)
      })

    // Data Return From WebSocket Client
    } else {
      log.silly('PuppetPadchat', 'return apiName: %s, msgId: %s', rawWebSocketData.apiName, rawWebSocketData.msgId)
      const msgId = rawWebSocketData.msgId

      // rawWebSocketData:
      // {
      //     "apiName": "WXHeartBeat",
      //     "data": "%7B%22status%22%3A0%2C%22message%22%3A%22ok%22%7D",
      //     "msgId": "abc231923912983",
      //     "userId": "test"
      // }
      const rawData: Object | string = JSON.parse(decodeURIComponent(rawWebSocketData.data))

      if (resolverDict[msgId]) {
        const resolve = resolverDict[msgId]
        delete resolverDict[msgId]
        // resolve({rawData: rawData, msgId: rawWebSocketData.msgId})
        resolve(rawData)
      }
    }
  }

  public async loginSucceed() {
    if (!(this.bridge)) {
      throw Error('cannot init bridge successfully!')
    }

    log.verbose('PuppetPadchatBridge', 'loginSucceed: Set heatbeat to websocket server')
    await this.bridge.WXHeartBeat()

    log.verbose('PuppetPadchatBridge', 'loginSucceed: Set token to websocket server')
    this.bridge.autoData.token = (await this.bridge.WXGetLoginToken()).token

    // Check 62 data. If has then use, or save 62 data here.
    if (!this.bridge.autoData.wxData || this.bridge.autoData.user_name !== this.bridge.username) {
      log.info('PuppetPadchatBridge', 'loginSucceed: No 62 data, or wrong 62 data')
      this.bridge.autoData.user_name = this.bridge.username
      this.bridge.autoData.nick_name = this.bridge.nickname
      this.bridge.autoData.wxData    = (await this.bridge.WXGenerateWxDat()).data
    }

    setTimeout(() => {
      this.saveConfig()
    }, 2 * 1000)

    return

    // Think more, whether it is need to syncContact
    // log.verbose('PuppetPadchatBridge', 'loginSucceed: SyncContact')
    // this.WXSyncContact()
  }

  public async saveConfig() {
    if (!(this.bridge)) {
      throw Error('cannot init bridge successfully!')
    }

    log.verbose('PuppetPadchatBridge', 'saveConfig, autoData: %s', JSON.stringify(this.bridge.autoData))
    if (this.bridge.autoData.wxData && this.bridge.autoData.token && this.bridge.autoData.user_name) {
      log.verbose('PuppetPadchatBridge', 'saveConfig: begin to save data to file')
      await this.options.profile.set('autoData', this.bridge.autoData)
      await this.options.profile.save()

      log.verbose('PuppetPadchatBridge', 'loginSucceed: Send ding to the bot, username: %s', this.bridge.username)
      await this.bridge.WXSendMsg(this.bridge.autoData.user_name, 'ding')

      this.userId = this.bridge.autoData.user_name // Puppet userId different with WebSocket userId
      const user = this.Contact.load(this.userId)
      await user.ready()
      this.emit('login', user)

      log.verbose('PuppetPadchatBridge', 'loginSucceed: Send login to the bot, user_name: %s', this.bridge.username)
      await this.bridge.WXSendMsg(this.bridge.autoData.user_name, 'Bot on line!')

      this.state.on(true)
      return
    } else {
      log.verbose('PuppetPadchatBridge', 'no enough data, save again, %s', JSON.stringify(this.bridge.autoData))
      setTimeout( () => {
        this.saveConfig()
      }, 2 * 1000)
      return
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
    // await some tasks...
    this.state.off(true)
  }

  public async logout(): Promise<void> {
    log.verbose('PuppetPadchat', 'logout()')

    if (!this.logonoff()) {
      throw new Error('logout before login?')
    }

    // this.emit('logout', this.user!) // becore we will throw above by logonoff() when this.user===undefined
    // this.user = undefined

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
    log.verbose('PuppetPadchat', 'contactAlias(%s, %s)', contactId, alias)

    if (typeof alias === 'undefined') {
      return 'padchat alias'
    }
    return
  }

  public async contactFindAll(query: ContactQueryFilter): Promise<string[]> {
    log.verbose('PuppetPadchat', 'contactFindAll(%s)', query)

    return []
  }

  public async contactAvatar(contactId: string): Promise<FileBox> {
    log.verbose('PuppetPadchat', 'contactAvatar(%s)', contactId)

    const WECHATY_ICON_PNG = path.resolve('../../docs/images/wechaty-icon.png')
    return FileBox.packLocal(WECHATY_ICON_PNG)
  }

  public async contactRawPayload(id: string): Promise<PadchatContactRawPayload> {
    log.verbose('PuppetPadchat', 'contactRawPayload(%s)', id)
    const rawPayload = await this.bridge.WXGetContact(id)
    return rawPayload
  }

  public async contactRawPayloadParser(rawPayload: PadchatContactRawPayload): Promise<ContactPayload> {
    log.verbose('PuppetPadchat', 'contactRawPayloadParser(%s)', rawPayload)

    if (!rawPayload.user_name) {
      throw Error('cannot get user_name(wxid)!')
    }

    const gender = {
      0: Gender.Unknown,
      1: Gender.Male,
      2: Gender.Female,
    }

    if (/@chatroom$/.test(rawPayload.user_name)) {
      throw Error('Room Object instead of Contact!')
    }

    let contactType = this.Contact.Type.Unknown
    if (/^gh_/.test(rawPayload.user_name)) {
      contactType = this.Contact.Type.Official
    } else {
      contactType = this.Contact.Type.Personal
    }

    const payload: ContactPayload = {
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
  public async messageRawPayload(id: string): Promise<PadchatMessageRawPayload> {
    throw Error('should not call messageRawPayload')
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

  public async messageRawPayloadParser(rawPayload: PadchatMessageRawPayload): Promise<MessagePayload> {
    let type: MessageType = this.Message.Type.Unknown

    switch (rawPayload.sub_type) {
      case PadchatMessageType.TEXT:
        type = this.Message.Type.Text
        break
      case PadchatMessageType.IMAGE:
        type = this.Message.Type.Image
        break
      case PadchatMessageType.VOICE:
        type = this.Message.Type.Audio
        break
      case PadchatMessageType.EMOTICON:
        type = this.Message.Type.Emoticon
        break
      case PadchatMessageType.APP:
        type = this.Message.Type.Attachment
        break
      case PadchatMessageType.VIDEO:
        type = this.Message.Type.Video
        break
      default:
        type = this.Message.Type.Text
    }

    const payload: MessagePayload = {
      date      : new Date(),
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
      const room = this.Room.load(payload.roomId)
      const contact = this.Contact.load(payload.fromId)
      await room.ready()
      await contact.ready()
    } else {
      if (!payload.fromId) {
        throw Error('empty contactId!')
      }
      const contact = this.Contact.load(payload.fromId)
      await contact.ready()
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
  }

  public async messageForward(
    receiver  : Receiver,
    messageId : string,
  ): Promise<void> {
    log.verbose('PuppetPadchat', 'messageForward(%s, %s)',
                              receiver,
                              messageId,
              )
  }

  /**
   *
   * Room
   *
   */
  public async roomRawPayload(id: string): Promise<PadchatRoomRawPayload> {
    log.verbose('PuppetPadchat', 'roomRawPayload(%s)', id)

    const rawPayload: PadchatRoomRawPayload = {
      big_head:         '',
      bit_mask:         4294967295,
      bit_value:        2050,
      chatroom_id:      700000154,
      chatroom_owner:   '',
      continue:         1,
      max_member_count: 500,
      member:           [],
      member_count:     4,
      msg_type:         2,
      nick_name:        '',
      small_head:       '',
      status:           1,
      uin:              324216852,
      user_name:        '',

      // owner      : 'padchat_room_owner_id',
      // topic      : 'padchat topic',
      // memberList : [],
    }
    return rawPayload
  }

  public async roomRawPayloadParser(rawPayload: PadchatRoomRawPayload): Promise<RoomPayload> {
    log.verbose('PuppetPadchat', 'roomRawPayloadParser(%s)', rawPayload)

    const payload: RoomPayload = {
      topic          : 'padchat topic',
      memberIdList   : [],
      nameMap        : new Map<string, string>(),
      roomAliasMap   : new Map<string, string>(),
      contactAliasMap: new Map<string, string>(),
    }

    return payload
  }

  public async roomFindAll(
    query: RoomQueryFilter = { topic: /.*/ },
  ): Promise<string[]> {
    log.verbose('PuppetPadchat', 'roomFindAll(%s)', query)

    return []
  }

  public async roomDel(
    roomId    : string,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetPadchat', 'roomDel(%s, %s)', roomId, contactId)
  }

  public async roomAdd(
    roomId    : string,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetPadchat', 'roomAdd(%s, %s)', roomId, contactId)
  }

  public async roomTopic(
    roomId: string,
    topic?: string,
  ): Promise<void | string> {
    log.verbose('PuppetPadchat', 'roomTopic(%s, %s)', roomId, topic)

    if (typeof topic === 'undefined') {
      return 'padchat room topic'
    }
    return
  }

  public async roomCreate(
    contactIdList : string[],
    topic         : string,
  ): Promise<string> {
    log.verbose('PuppetPadchat', 'roomCreate(%s, %s)', contactIdList, topic)

    return 'mock_room_id'
  }

  public async roomQuit(roomId: string): Promise<void> {
    log.verbose('PuppetPadchat', 'roomQuit(%s)', roomId)
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
  }

  public async friendRequestAccept(
    contactId : string,
    ticket    : string,
  ): Promise<void> {
    log.verbose('PuppetPadchat', 'friendRequestAccept(%s, %s)', contactId, ticket)
  }

}

export default PuppetPadchat
