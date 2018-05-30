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

import {
  FileBox,
}             from 'file-box'

import {
  // Message,
  MessagePayload, MessageType,
}                       from '../message'

import Misc           from '../misc'

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
  RoomMemberQueryFilter,
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
  Bridge,
  resolverDict,
  AutoDataType,
}                       from './bridge'

import {
  PadchatContactRawPayload,
  PadchatMessageRawPayload,
  PadchatMessageType,
  PadchatRoomRawPayload,
  PadchatRoomRawMember,
}                       from './padchat-schemas'

export type PuppetFoodType = 'scan' | 'ding'
export type ScanFoodType   = 'scan' | 'login' | 'logout'

export interface RawWebSocketDataType {
  type?:   number, // -1 when logout
  msg?:    string, // '掉线了' when logout
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
  // public botWs:   WebSocket

  constructor(
    public options: PuppetOptions,
  ) {
    super(options)

    this.bridge = new Bridge({
      userId   : TOKEN,
      autoData : {},
      // profile:  profile, // should be profile in the future
    })

    this.bridge.on('ws', data => this.wsOnMessage(data))

  }

  public toString() {
    return `PuppetPadchat<${this.options.profile.name}>`
  }

  public ding(data?: any): Promise<string> {
    return data
  }

  public initWatchdog(): void {
    log.verbose('PuppetPadchat', 'initWatchdogForPuppet()')

    const puppet = this

    // clean the dog because this could be re-inited
    this.watchdog.removeAllListeners()

    puppet.on('watchdog', food => this.watchdog.feed(food))
    this.watchdog.on('feed', async food => {
      log.silly('PuppetPadchat', 'initWatchdogForPuppet() dog.on(feed, food={type=%s, data=%s})', food.type, food.data)
      // feed the dog, heartbeat the puppet.
      puppet.emit('heartbeat', food.data)

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
  }

  public async start(): Promise<void> {
    // Connect with websocket server

    if (!this.bridge) {
      throw Error('cannot init bridge successfully!')
    }

    /**
     * state has two main state: ON / OFF
     * ON (pending)
     * OFF (pending)
     */
    this.state.on('pending')

    const bridge = this.bridge = await this.initBridge()

    this.bridge.loginSucceed = false

    log.verbose('PuppetPadchat', `start() with ${this.options.profile}`)

    this.bridge.once('open', async() => {

      this.emit('watchdog', {
        data: 'start',
      })

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

    if (this.state.off()) {
      const e = new Error('initBridge() found targetState != live, no init anymore')
      log.warn('PuppetPadchat', e.message)
      throw e
    }

    await this.bridge.initWs()

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
      // check logout:
      if (rawWebSocketData.type === -1) {
        this.emit('logout', this.userSelf())
      }

      log.silly('PuppetPadchat', 'return apiName: %s, msgId: %s', rawWebSocketData.apiName, rawWebSocketData.msgId)
      const msgId = rawWebSocketData.msgId

      let rawData: Object
      if (!rawWebSocketData.data) {
        log.silly('PuppetPadchat', 'WebSocket Server get empty message data form API call: %s', rawWebSocketData.apiName)
        rawData = {}
      } else {
        rawData = JSON.parse(decodeURIComponent(rawWebSocketData.data))
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
      // this.emit('start')
      this.initWatchdog()

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

    this.watchdog.sleep()
    setImmediate(() => this.bridge.removeAllListeners())

    await this.logout()
    this.bridge.closeWs()

    // await some tasks...
    this.state.off(true)

    // this.emit('stop')
  }

  public async logout(): Promise<void> {
    log.verbose('PuppetPadchat', 'logout()')

    if (!this.userId) {
      throw new Error('logout before login?')
    }

    this.emit('logout', this.userId) // becore we will throw above by logonoff() when this.user===undefined
    this.userId = undefined

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

    const payload = await this.contactPayload(contactId)

    if (typeof alias === 'undefined') {
      return payload.alias || ''
    }

    await this.bridge.WXSetUserRemark(contactId, alias || '')

    return
  }

  public async contactFindAll(query: ContactQueryFilter): Promise<string[]> {
    log.verbose('PuppetPadchat', 'contactFindAll(%s)', query)

    // const contactRawPayloadMap = (await this.bridge.checkSyncContactOrRoom()).contactMap

    const contactIdList: string[] = []
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

  protected contactQueryFilterToFunction(
    query: ContactQueryFilter,
  ): (payload: ContactPayload) => boolean {
    log.verbose('PuppetPadchat', 'contactQueryFilterToFunctionString({ %s })',
                            Object.keys(query)
                                  .map(k => `${k}: ${query[k as keyof ContactQueryFilter]}`)
                                  .join(', '),
              )

    if (Object.keys(query).length !== 1) {
      throw new Error('query only support one key. multi key support is not availble now.')
    }

    const filterKey = Object.keys(query)[0] as keyof ContactQueryFilter

    let filterValue: string | RegExp | undefined  = query[filterKey]
    if (!filterValue) {
      throw new Error('filterValue not found')
    }

    /**
     * must be string because we need inject variable value
     * into code as variable namespecialContactList
     */
    let filterFunction: (payload: ContactPayload) => boolean

    if (filterValue instanceof RegExp) {
      const regex = filterValue
      filterFunction = (payload: ContactPayload) => regex.test(payload[filterKey] || '')
    } else if (typeof filterValue === 'string') {
      filterValue = filterValue.replace(/'/g, '\\\'')
      filterFunction = (payload: ContactPayload) => payload[filterKey] === filterValue
    } else {
      throw new Error('unsupport name type')
    }

    return filterFunction
  }

  public async contactAvatar(contactId: string): Promise<FileBox> {
    log.verbose('PuppetPadchat', 'contactAvatar(%s)', contactId)

    const payload = await this.contactPayload(contactId)

    if (!payload.avatar) {
      throw new Error('no avatar')
    }

    const file = FileBox.packRemote(payload.avatar)
    return file
  }

  public async contactRawPayload(id: string): Promise<PadchatContactRawPayload> {
    log.verbose('PuppetPadchat', 'contactRawPayload(%s)', id)
    const rawPayload = await this.bridge.WXGetContactPayload(id)
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

  public async messageFile(id: string): Promise<FileBox> {
    // const rawPayload = await this.messageRawPayload(id)

    const base64 = 'cRH9qeL3XyVnaXJkppBuH20tf5JlcG9uFX1lL2IvdHRRRS9kMMQxOPLKNYIzQQ=='
    const filename = 'test.txt'

    const file = FileBox.packBase64(
      base64,
      filename,
    )

    return file
  }

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
        type = this.Message.Type.Unknown
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

    const id = receiver.contactId || receiver.roomId
    if (!id) {
      throw new Error('no id!')
    }

    await this.bridge.WXSendImage(
      id,
      await file.base64(),
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

    const msg = this.Message.create(messageId)
    await msg.ready()

    if (msg.type() === this.Message.Type.Text) {
      await this.messageSendText(
        receiver,
        msg.text(),
      )
    } else {
      await this.messageSendFile(
        receiver,
        await msg.file(),
      )
    }
  }

  /**
   *
   * Room
   *
   */
  public async roomRawPayload(id: string): Promise<PadchatRoomRawPayload> {
    log.verbose('PuppetPadchat', 'roomRawPayload(%s)', id)
    const rawPayload = await this.bridge.WXGetRoomPayload(id)
    return rawPayload
  }

  public async roomRawPayloadParser(rawPayload: PadchatRoomRawPayload): Promise<RoomPayload> {
    log.verbose('PuppetPadchat', 'roomRawPayloadParser(%s)', rawPayload)

    const memberList = (rawPayload.member || [])
                        .map(id => this.Contact.load(id))

    await Promise.all(memberList.map(c => c.ready()))

    const padchatRoomRawMemberList = await this.bridge.WXGetChatRoomMember(rawPayload.user_name)

    const nameMap         = await this.roomParseMap('name'        , padchatRoomRawMemberList.member)
    const roomAliasMap    = await this.roomParseMap('roomAlias'   , padchatRoomRawMemberList.member)
    const contactAliasMap = await this.roomParseMap('contactAlias', padchatRoomRawMemberList.member)

    const payload: RoomPayload = {
      topic          : rawPayload.nick_name,
      memberIdList   : rawPayload.member,
      nameMap        : nameMap,
      roomAliasMap   : roomAliasMap,
      contactAliasMap: contactAliasMap,
    }

    return payload
  }

  private roomParseMap(
    parseSection: keyof RoomMemberQueryFilter,
    memberList?:  PadchatRoomRawMember[],
  ): Map<string, string> {
    log.verbose('PuppetPadchat', 'roomParseMap(%s, memberList.length=%d)',
                                    parseSection,
                                    memberList && memberList.length,
                )

    const dict: Map<string, string> = new Map<string, string>()
    if (memberList && Array.isArray(memberList)) {
      memberList.forEach(member => {
        let tmpName: string

        switch (parseSection) {
          case 'name':
            tmpName = member.nick_name
            break
          case 'roomAlias':
            tmpName = member.chatroom_nick_name
            break
          case 'contactAlias':
            const contact = this.Contact.load(member.user_name)
            tmpName = contact.alias() || ''
            break
          default:
            throw new Error('PuppetPadchat parseMap failed, member not found')
        }

        dict.set(member.user_name, Misc.stripEmoji(tmpName))
      })
    }
    return dict
  }

  public async roomFindAll(
    query: RoomQueryFilter = { topic: /.*/ },
  ): Promise<string[]> {
    log.verbose('PuppetPadchat', 'roomFindAll(%s)', query)

    // TODO: query
    // const rooomMap = (await this.bridge.checkSyncContactOrRoom()).roomMap
    // const roomIdList: string[] = []
    // rooomMap.forEach(async (value , id) => {
    //   roomIdList.push(id)
    //   this.Room.load(id, await this.roomRawPayloadParser(value))
    // })

    // return roomIdList
    return []
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

    const payload = await this.roomPayload(roomId)

    if (typeof topic === 'undefined') {
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

    // const rawPayload = await this.contactRawPayload(contactId)

    // if (!rawPayload.ticket) {
    //   throw new Error('no ticket')
    // }

    // await this.bridge.WXAcceptUser(
    //   rawPayload.stranger,
    //   rawPayload.ticket,
    // )
  }

}

export default PuppetPadchat
