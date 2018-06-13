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

import path  from 'path'
// import fs    from 'fs'
// import cuid from 'cuid'

import LRU      from 'lru-cache'
import flatten  from 'array-flatten'

import {
  FileBox,
}               from 'file-box'

import Misc from '../misc'

import {
  ContactPayload,

  MessagePayload,
  MessageType,

  RoomPayload,
  RoomMemberPayload,

  Puppet,
  PuppetOptions,

  Receiver,

  FriendshipPayload,
  FriendshipPayloadReceive,

  WATCHDOG_TIMEOUT,
}                                 from '../puppet/'

import {
  contactRawPayloadParser,

  fileBoxToQrcode,
  // friendRequestEventMessageParser,
  friendshipRawPayloadParser,

  isStrangerV1,
  isStrangerV2,

  messageRawPayloadParser,

  roomRawPayloadParser,

  roomJoinEventMessageParser,
  roomLeaveEventMessageParser,
  roomTopicEventMessageParser,

  friendshipConfirmEventMessageParser,
  friendshipReceiveEventMessageParser,
  friendshipVerifyEventMessageParser,
}                                         from './pure-function-helpers'

import {
  log,
  qrCodeForChatie,
}                   from '../config'

import {
  padchatToken,
  WECHATY_PUPPET_PADCHAT_ENDPOINT,
}                                   from './config'

import {
  PadchatManager,
  // resolverDict,
  // AutoDataType,
}                       from './padchat-manager'

import {
  // PadchatPayload,
  PadchatContactPayload,
  PadchatMessagePayload,
  PadchatRoomPayload,
  // PadchatRoomMemberListPayload,
  PadchatRoomMemberPayload,
  PadchatMessageType,

  // PadchatMessageType,
  // PadchatContinue,
  // PadchatMsgType,
  // PadchatStatus,
  // PadchatPayloadType,
  // PadchatRoomRawMember,
}                           from './padchat-schemas'
import {
  WXSearchContactType,
  WXSearchContactTypeStatus,
}                           from './padchat-rpc.type'

export type PuppetFoodType = 'scan' | 'ding'
export type ScanFoodType   = 'scan' | 'login' | 'logout'

export class PuppetPadchat extends Puppet {

  // in seconds, 4 minute for padchat
  protected [WATCHDOG_TIMEOUT] = 4 * 60

  // private readonly cachePadchatContactPayload       : LRU.Cache<string, PadchatContactRawPayload>
  private readonly cachePadchatFriendshipPayload : LRU.Cache<string, PadchatMessagePayload>
  private readonly cachePadchatMessagePayload    : LRU.Cache<string, PadchatMessagePayload>
  // private readonly cachePadchatRoomPayload          : LRU.Cache<string, PadchatRoomRawPayload>

  public padchatManager?:  PadchatManager

  constructor(
    public options: PuppetOptions,
  ) {
    super(options)

    const lruOptions: LRU.Options = {
      max: 1000,
      // length: function (n) { return n * 2},
      dispose: function (key: string, val: any) {
        log.silly('PuppetPadchat', 'constructor() lruOptions.dispose(%s, %s)', key, JSON.stringify(val))
      },
      maxAge: 1000 * 60 * 60,
    }

    // this.cachePadchatContactPayload       = new LRU<string, PadchatContactRawPayload>(lruOptions)
    this.cachePadchatFriendshipPayload = new LRU<string, PadchatMessagePayload>(lruOptions)
    this.cachePadchatMessagePayload       = new LRU<string, PadchatMessagePayload>(lruOptions)
    // this.cachePadchatRoomPayload          = new LRU<string, PadchatRoomRawPayload>(lruOptions)
  }

  public toString() {
    return `PuppetPadchat<${this.options.memory.name}>`
  }

  public ding(data?: any): Promise<string> {
    return data
  }

  public startWatchdog(): void {
    log.verbose('PuppetPadchat', 'initWatchdogForPuppet()')

    if (!this.padchatManager) {
      throw new Error('no bridge')
    }

    // clean the dog because this could be re-inited
    this.watchdog.removeAllListeners()

    /**
     * Use bridge's heartbeat to feed dog
     */
    this.padchatManager.on('heartbeat', (data: string) => {
      log.silly('PuppetPadchat', 'startWatchdog() bridge.on(heartbeat)')
      this.watchdog.feed({
        data,
      })
    })
    this.watchdog.on('feed', async food => {
      log.silly('PuppetPadchat', 'startWatchdog() watchdog.on(feed, food={type=%s, data=%s})', food.type, food.data)
    })

    this.watchdog.on('reset', async (food, timeout) => {
      log.warn('PuppetPadchat', 'startWatchdog() dog.on(reset) last food:%s, timeout:%s',
                                food.data,
                                timeout,
              )
      await this.restart('watchdog.on(reset)')
    })

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

    const bridge = this.padchatManager = new PadchatManager({
      memory   : this.options.memory,
      token    : padchatToken(),
      endpoint : WECHATY_PUPPET_PADCHAT_ENDPOINT,
    })

    await this.startBridge(bridge)
    await this.startWatchdog()

    this.state.on(true)
    this.emit('start')
  }

  protected async login(selfId: string): Promise<void> {
    if (!this.padchatManager) {
      throw new Error('no bridge')
    }
    await super.login(selfId)
    this.padchatManager.syncContactsAndRooms()
  }

  public async startBridge(bridge: PadchatManager): Promise<void> {
    log.verbose('PuppetPadchat', 'startBridge()')

    if (this.state.off()) {
      throw new Error('startBridge() state is off')
    }

    bridge.removeAllListeners()
    // bridge.on('ding'     , Event.onDing.bind(this))
    // bridge.on('error'    , e => this.emit('error', e))
    // bridge.on('log'      , Event.onLog.bind(this))
    bridge.on('scan',    (qrcode: string, status: number, data?: string) => this.emit('scan', qrcode, status, data))
    bridge.on('login',   (userId: string)                                => this.login(userId))
    bridge.on('message', (rawPayload: PadchatMessagePayload)             => this.onPadchatMessage(rawPayload))
    bridge.on('logout',  ()                                              => this.logout())

    bridge.on('destroy', reason => {
      log.warn('PuppetPadchat', 'startBridge() bridge.on(destroy) for %s. Restarting PuppetPadchat ... ', reason)
      this.restart(reason)
    })

    await bridge.start()
  }

  protected async restart(reason: string): Promise<void> {
    log.verbose('PuppetPadchat', 'restart(%s)', reason)

    await this.stop()
    await this.start()

  }

  protected async onPadchatMessage(rawPayload: PadchatMessagePayload): Promise<void> {
    log.verbose('PuppetPadchat', 'onPadchatMessage({id=%s, type=%s(%s)})',
                                rawPayload.msg_id,
                                PadchatMessageType[rawPayload.sub_type],
                                rawPayload.msg_type,
              )
    console.log('rawPayload:', rawPayload)

    switch (rawPayload.sub_type) {
      case PadchatMessageType.VerifyMsg:
        this.cachePadchatFriendshipPayload.set(
          rawPayload.msg_id,
          rawPayload,
        )
        this.emit('friendship', rawPayload.msg_id)
        break

      case PadchatMessageType.Recalled:
        /**
         * When someone joined the room invited by Bot,
         * the bot will receive a `recall-able` message for room event
         *
         * { content: '12740017638@chatroom:\n<sysmsg type="delchatroommember">\n\t<delchatroommember>\n\t\t<plain>
         *            <![CDATA[You invited 卓桓、Zhuohuan, 太阁_传话助手, 桔小秘 to the group chat.   ]]></plain>...,
         *  continue: 1,
         *  description: '',
         *  from_user: '12740017638@chatroom',
         *  msg_id: '232220931339852872',
         *  msg_source: '',
         *  msg_type: 5,
         *  status: 1,
         *  sub_type: 10002,
         *  timestamp: 1528831349,
         *  to_user: 'wxid_zj2cahpwzgie12',
         *  uin: 324216852 }
         */
        await Promise.all([
          this.onPadchatMessageRoomEvent(rawPayload),
        ])
        break
      case PadchatMessageType.Sys:
        await Promise.all([
          this.onPadchatMessageFriendshipEvent(rawPayload),
          this.onPadchatMessageRoomEvent(rawPayload),
        ])
        break

      case PadchatMessageType.App:
      case PadchatMessageType.Emoticon:
      case PadchatMessageType.Image:
      case PadchatMessageType.MicroVideo:
      case PadchatMessageType.Video:
      case PadchatMessageType.Voice:
         // TODO: the above types are filel type

      default:
        this.cachePadchatMessagePayload.set(
          rawPayload.msg_id,
          rawPayload,
        )
        this.emit('message', rawPayload.msg_id)
        break
    }
  }

  protected async onPadchatMessageRoomEvent(rawPayload: PadchatMessagePayload): Promise<void> {
    log.verbose('PuppetPadchat', 'onPadchatMessageRoomEvent({id=%s})', rawPayload.msg_id)
    /**
     * 1. Look for room join event
     */
    const roomJoin = roomJoinEventMessageParser(rawPayload)
    if (roomJoin) {
      const inviteeNameList = roomJoin.inviteeNameList
      const inviterName     = roomJoin.inviterName
      const roomId          = roomJoin.roomId

      const inviteeIdList = await Misc.retry(async (retry, attempt) => {
        log.verbose('PuppetPadchat', 'onPadchatMessageRoomEvent({id=%s}) roomJoin retry(attempt=%d)', attempt)

        const tryIdList = flatten<string>(
          await Promise.all(
            inviteeNameList.map(
              inviteeName => this.roomMemberSearch(roomId, inviteeName),
            ),
          ),
        )

        if (tryIdList.length) {
          return tryIdList
        }

        if (!this.padchatManager) {
          throw new Error('no manager')
        }

        /**
         * PURGE Cache and Reload
         */
        await this.padchatManager.getRoomMemberIdList(roomId, true)

        return retry(new Error('roomMemberSearch() not found'))

      }).catch(e => {
        log.warn('PuppetPadchat', 'onPadchatMessageRoomEvent({id=%s}) roomJoin retry() fail: %s', e.message)
        return [] as string[]
      })

      const inviterIdList = await this.roomMemberSearch(roomId, inviterName)

      if (inviterIdList.length < 1) {
        throw new Error('no inviterId found')
      } else if (inviterIdList.length > 1) {
        log.warn('PuppetPadchat', 'onPadchatMessageRoomEvent() case PadchatMesssageSys: inviterId found more than 1, use the first one.')
      }

      const inviterId = inviterIdList[0]

      this.emit('room-join', roomId, inviteeIdList,  inviterId)
    }
    /**
     * 2. Look for room leave event
     */
    const roomLeave = roomLeaveEventMessageParser(rawPayload)
    if (roomLeave) {
      const leaverNameList = roomLeave.leaverNameList
      const removerName    = roomLeave.removerName
      const roomId         = roomLeave.roomId

      const leaverIdList = flatten<string>(
        await Promise.all(
          leaverNameList.map(
            leaverName => this.roomMemberSearch(roomId, leaverName),
          ),
        ),
      )
      const removerIdList = await this.roomMemberSearch(roomId, removerName)
      if (removerIdList.length < 1) {
        throw new Error('no removerId found')
      } else if (removerIdList.length > 1) {
        log.warn('PuppetPadchat', 'onPadchatMessage() case PadchatMesssageSys: removerId found more than 1, use the first one.')
      }
      const removerId = removerIdList[0]

      this.emit('room-leave',  roomId, leaverIdList, removerId)
    }
    /**
     * 3. Look for room topic event
     */
    const roomTopic = roomTopicEventMessageParser(rawPayload)
    if (roomTopic) {
      const changerName = roomTopic.changerName
      const newTopic    = roomTopic.topic
      const roomId      = roomTopic.roomId

      const roomPayload = await this.roomPayload(roomId)
      const oldTopic = roomPayload.topic

      const changerIdList = await this.roomMemberSearch(roomId, changerName)
      if (changerIdList.length < 1) {
        throw new Error('no changerId found')
      } else if (changerIdList.length > 1) {
        log.warn('PuppetPadchat', 'onPadchatMessage() case PadchatMesssageSys: changerId found more than 1, use the first one.')
      }
      const changerId = changerIdList[0]

      this.emit('room-topic',  roomId, newTopic, oldTopic, changerId)
    }
  }

  protected async onPadchatMessageFriendshipEvent(rawPayload: PadchatMessagePayload): Promise<void> {
    log.verbose('PuppetPadchat', 'onPadchatMessageFriendshipEvent({id=%s})', rawPayload.msg_id)
    /**
     * 1. Look for friendship confirm event
     */
    const friendshipConfirmContactId = friendshipConfirmEventMessageParser(rawPayload)
    /**
     * 2. Look for friendship receive event
     */
    const friendshipReceiveContactId = friendshipReceiveEventMessageParser(rawPayload)
    /**
     * 3. Look for friendship verify event
     */
    const friendshipVerifyContactId = friendshipVerifyEventMessageParser(rawPayload)

    if (   friendshipConfirmContactId
        || friendshipReceiveContactId
        || friendshipVerifyContactId
    ) {
      this.emit('friendship', rawPayload.msg_id)
    }
  }

  public async stop(): Promise<void> {
    log.verbose('PuppetPadchat', 'stop()')

    if (!this.padchatManager) {
      throw new Error('no bridge')
    }

    if (this.state.off()) {
      log.warn('PuppetPadchat', 'stop() is called on a OFF puppet. await ready(off) and return.')
      await this.state.ready('off')
      return
    }

    this.state.off('pending')

    this.watchdog.sleep()
    await this.logout()

    setImmediate(() => this.padchatManager && this.padchatManager.removeAllListeners())
    await this.padchatManager.stop()

    // await some tasks...
    this.state.off(true)
    this.emit('stop')
  }

  public async logout(): Promise<void> {
    log.verbose('PuppetPadchat', 'logout()')

    if (!this.id) {
      log.warn('PuppetPadchat', 'logout() this.id not exist')
      // throw new Error('logout before login?')
      return
    }

    if (!this.padchatManager) {
      throw new Error('no bridge')
    }

    this.emit('logout', this.id) // becore we will throw above by logonoff() when this.user===undefined
    this.id = undefined

    // if (!passive) {
    //   await this.bridge.WXLogout()
    // }

    await this.padchatManager.logout()
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

    if (!this.padchatManager) {
      throw new Error('no bridge')
    }

    await this.padchatManager.WXSetUserRemark(contactId, alias || '')

    return
  }

  public async contactList(): Promise<string[]> {
    log.verbose('PuppetPadchat', 'contactList()')

    if (!this.padchatManager) {
      throw new Error('no bridge')
    }

    const contactIdList = this.padchatManager.getContactIdList()

    return contactIdList
  }

  public async contactAvatar(contactId: string)                : Promise<FileBox>
  public async contactAvatar(contactId: string, file: FileBox) : Promise<void>

  public async contactAvatar(contactId: string, file?: FileBox): Promise<void | FileBox> {
    log.verbose('PuppetPadchat', 'contactAvatar(%s%s)',
                                  contactId,
                                  file ? (', ' + file.name) : '',
                )

    /**
     * 1. set avatar for user self
     */
    if (file) {
      if (contactId !== this.selfId()) {
        throw new Error('can not set avatar for others')
      }
      if (!this.padchatManager) {
        throw new Error('no bridge')
      }
      await this.padchatManager.WXSetHeadImage(await file.toBase64())
      return
    }

    /**
     * 2. get avatar
     */
    const payload = await this.contactPayload(contactId)

    if (!payload.avatar) {
      throw new Error('no avatar')
    }

    const fileBox = FileBox.fromUrl(payload.avatar)
    return fileBox
  }

  public async contactQrcode(contactId: string): Promise<string> {
    if (contactId !== this.selfId()) {
      throw new Error('can not set avatar for others')
    }
    if (!this.padchatManager) {
      throw new Error('no bridge')
    }
    const base64 = await this.padchatManager.WXGetUserQRCode(contactId, 0)
    const qrcode = await fileBoxToQrcode(base64)
    return qrcode
  }

  public async contactRawPayload(contactId: string): Promise<PadchatContactPayload> {
    log.silly('PuppetPadchat', 'contactRawPayload(%s)', contactId)

    if (!this.padchatManager) {
      throw new Error('no bridge')
    }
    const rawPayload = await this.padchatManager.contactRawPayload(contactId)
    return rawPayload
  }

  public async contactRawPayloadParser(rawPayload: PadchatContactPayload): Promise<ContactPayload> {
    log.silly('PuppetPadchat', 'contactRawPayloadParser({user_name="%s"})', rawPayload.user_name)

    const payload: ContactPayload = contactRawPayloadParser(rawPayload)
    return payload
  }

  /**
   *
   * Message
   *
   */

  public async messageFile(messageId: string): Promise<FileBox> {
    log.warn('PuppetPadchat', 'messageFile(%s) not implemented yet', messageId)

    // const rawPayload = await this.messageRawPayload(id)

    // TODO

    if (!this.padchatManager) {
      throw new Error('no bridge')
    }

    const rawPayload = await this.messageRawPayload(messageId)
    const payload    = await this.messagePayload(messageId)

    const rawText = JSON.stringify(rawPayload)

    let result

    switch (payload.type) {
      case MessageType.Attachment:
        break

      case MessageType.Audio:
        result = await this.padchatManager.WXGetMsgVoice(rawText)
        console.log(result)
        return FileBox.fromBase64(result.data.image, 'test.slk')

      case MessageType.Emoticon:
        result = await this.padchatManager.WXGetMsgImage(rawText)
        console.log(result)
        return FileBox.fromBase64(result.data.image, 'test.gif')

      case MessageType.Image:
        result = await this.padchatManager.WXGetMsgImage(rawText)
        console.log(result)
        return FileBox.fromBase64(result.data.image, 'test.jpg')

      case MessageType.Video:
        result = await this.padchatManager.WXGetMsgVideo(rawText)
        console.log(result)
        return FileBox.fromBase64(result.data.image, 'test.mp4')

      default:
        throw new Error('unsupport type: ' + PadchatMessageType[rawPayload.sub_type] + ':' + rawPayload.sub_type)
    }

    const base64 = 'cRH9qeL3XyVnaXJkppBuH20tf5JlcG9uFX1lL2IvdHRRRS9kMMQxOPLKNYIzQQ=='
    const filename = 'test-' + messageId + '.txt'

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
    log.verbose('PuppetPadChat', 'messageRawPayloadParser({msg_id="%s"})', rawPayload.msg_id)

    const payload: MessagePayload = messageRawPayloadParser(rawPayload)

    log.silly('PuppetPadchat', 'messagePayload(%s)', JSON.stringify(payload))
    return payload
  }

  public async messageSendText(
    receiver : Receiver,
    text     : string,
  ): Promise<void> {
    log.verbose('PuppetPadchat', 'messageSend(%s, %s)', JSON.stringify(receiver), text)
    const id = receiver.contactId || receiver.roomId
    if (!id) {
      throw Error('no id')
    }
    if (!this.padchatManager) {
      throw new Error('no bridge')
    }
    await this.padchatManager.WXSendMsg(id, text)
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

    if (!this.padchatManager) {
      throw new Error('no bridge')
    }

    const type = file.mimeType || path.extname(file.name)
    switch (type) {
      case '.slk':
        // 发送语音消息(微信silk格式语音)
        await this.padchatManager.WXSendVoice(
          id,
          await file.toBase64(),
          60,
        )
        break

      default:
        await this.padchatManager.WXSendImage(
          id,
          await file.toBase64(),
        )
        break
    }
  }

  public async messageSendContact(
    receiver  : Receiver,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetPadchat', 'messageSend("%s", %s)', JSON.stringify(receiver), contactId)

    if (!this.padchatManager) {
      throw new Error('no bridge')
    }

    const id = receiver.contactId || receiver.roomId
    if (!id) {
      throw Error('no id')
    }

    const payload = await this.contactPayload(contactId)
    const title = payload.name + '名片'
    await this.padchatManager.WXShareCard(id, contactId, title)
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
  public async roomMemberRawPayload(
    roomId    : string,
    contactId : string,
  ): Promise<PadchatRoomMemberPayload> {
    log.silly('PuppetPadchat', 'roomMemberRawPayload(%s)', roomId)

    if (!this.padchatManager) {
      throw new Error('no bridge')
    }

    const rawPayload = await this.padchatManager.roomMemberRawPayload(roomId, contactId)
    return rawPayload
  }

  public async roomMemberRawPayloadParser(
    rawPayload: PadchatRoomMemberPayload,
  ): Promise<RoomMemberPayload> {
    log.silly('PuppetPadchat', 'roomMemberRawPayloadParser(%s)', rawPayload)

    const payload: RoomMemberPayload = {
      id        : rawPayload.user_name,
      inviterId : rawPayload.invited_by,
      roomAlias : rawPayload.chatroom_nick_name,
    }

    return payload
  }

  public async roomRawPayload(roomId: string): Promise<PadchatRoomPayload> {
    log.verbose('PuppetPadchat', 'roomRawPayload(%s)', roomId)

    if (!this.padchatManager) {
      throw new Error('no bridge')
    }

    const rawPayload = await this.padchatManager.roomRawPayload(roomId)
    return rawPayload
  }

  public async roomRawPayloadParser(rawPayload: PadchatRoomPayload): Promise<RoomPayload> {
    log.verbose('PuppetPadchat', 'roomRawPayloadParser(rawPayload.user_name="%s")', rawPayload.user_name)

    // const memberIdList = await this.bridge.getRoomMemberIdList()
    //  WXGetChatRoomMember(rawPayload.user_name)

    const payload: RoomPayload = roomRawPayloadParser(rawPayload)

    return payload
  }

  public async roomMemberList(roomId: string): Promise<string[]> {
    log.verbose('PuppetPadchat', 'roomMemberList(%s)', roomId)

    if (!this.padchatManager) {
      throw new Error('no bridge')
    }

    const memberIdList = await this.padchatManager.getRoomMemberIdList(roomId)
    log.silly('PuppetPadchat', 'roomMemberList()=%d', memberIdList.length)

    return memberIdList
  }

  public async roomList(): Promise<string[]> {
    log.verbose('PuppetPadchat', 'roomList()')

    if (!this.padchatManager) {
      throw new Error('no bridge')
    }

    const roomIdList = await this.padchatManager.getRoomIdList()
    log.silly('PuppetPadchat', 'roomList()=%d', roomIdList.length)

    return roomIdList
  }

  public async roomDel(
    roomId    : string,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetPadchat', 'roomDel(%s, %s)', roomId, contactId)

    if (!this.padchatManager) {
      throw new Error('no bridge')
    }

    // Should check whether user is in the room. WXDeleteChatRoomMember won't check if user in the room automatically
    await this.padchatManager.WXDeleteChatRoomMember(roomId, contactId)
  }

  public async roomQrcode(roomId: string): Promise<string> {
    log.verbose('PuppetPadchat', 'roomQrCode(%s)', roomId)

    // TODO

    throw new Error('not support')

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

    if (!this.padchatManager) {
      throw new Error('no bridge')
    }

    // XXX: did there need to calc the total number of the members in this room?
    // if n <= 40 then add() else invite() ?
    try {
      log.verbose('PuppetPadchat', 'roomAdd(%s, %s) try to Add', roomId, contactId)
      await this.padchatManager.WXAddChatRoomMember(roomId, contactId)
    } catch (e) {
      // FIXME
      console.error(e)
      log.warn('PuppetPadchat', 'roomAdd(%s, %s) Add exception: %s', e)
      log.verbose('PuppetPadchat', 'roomAdd(%s, %s) try to Invite', roomId, contactId)
      await this.padchatManager.WXInviteChatRoomMember(roomId, contactId)
    }
  }

  public async roomTopic(roomId: string)                : Promise<string>
  public async roomTopic(roomId: string, topic: string) : Promise<void>

  public async roomTopic(
    roomId: string,
    topic?: string,
  ): Promise<void | string> {
    log.verbose('PuppetPadchat', 'roomTopic(%s, %s)', roomId, topic)

    if (typeof topic === 'undefined') {
      const payload = await this.roomPayload(roomId)
      return payload.topic
    }

    if (!this.padchatManager) {
      throw new Error('no bridge')
    }

    await this.padchatManager.WXSetChatroomName(roomId, topic)

    return
  }

  public async roomCreate(
    contactIdList : string[],
    topic         : string,
  ): Promise<string> {
    log.verbose('PuppetPadchat', 'roomCreate(%s, %s)', contactIdList, topic)

    if (!this.padchatManager) {
      throw new Error('no bridge')
    }

    // FIXME:
    const roomId = await this.padchatManager.WXCreateChatRoom(contactIdList)

    const roomPayload = await Misc.retry(async (retry, attempt) => {
      log.verbose('PuppetPadchat', 'roomCreate() roomId=%s retry attempt=%d', roomId, attempt)

      try {
        const tryRoomPayload = await this.roomPayload(roomId)
        if (tryRoomPayload) {
          return tryRoomPayload
        } else {
          return retry(new Error('room create payload not ready'))
        }
      } catch (e) {
        return retry(e)
      }
    })

    // bridge.WXGetContact(roomId)

    console.log('roomCreate returl:', roomId)
    console.log('roomCreate roomPayload:', roomPayload)

    return roomId
  }

  public async roomQuit(roomId: string): Promise<void> {
    log.verbose('PuppetPadchat', 'roomQuit(%s)', roomId)

    if (!this.padchatManager) {
      throw new Error('no bridge')
    }

    await this.padchatManager.WXQuitChatRoom(roomId)
  }

  public async roomAnnounce(roomId: string)             : Promise<string>
  public async roomAnnounce(roomId: string, text: string) : Promise<void>

  public async roomAnnounce(roomId: string, text?: string): Promise<void | string> {
    log.verbose('PuppetPadchat', 'roomAnnounce(%s, %s)', roomId, text ? text : '')

    if (!this.padchatManager) {
      throw new Error('no bridge')
    }

    if (text) {
      await this.padchatManager.WXSetChatroomAnnouncement(roomId, text)
    } else {
      return await this.padchatManager.WXGetChatroomAnnouncement(roomId)
    }
  }

  /**
   *
   * Friendship
   *
   */
  public async friendshipVerify(
    contactId : string,
    hello     : string,
  ): Promise<void> {
    log.verbose('PuppetPadchat', 'friendshipVerify(%s, %s)', contactId, hello)

    if (!this.padchatManager) {
      throw new Error('no bridge')
    }

    const rawSearchPayload: WXSearchContactType = await this.padchatManager.WXSearchContact(contactId)

    /**
     * If the contact is not stranger, than ussing WXSearchContact can get user_name
     */
    if (rawSearchPayload.user_name !== '' && !isStrangerV1(rawSearchPayload.user_name) && !isStrangerV2(rawSearchPayload.user_name)) {
      log.warn('PuppetPadchat', 'friendRequestSend %s has been friend with bot, no need to send friend request!', contactId)
      return
    }

    let strangerV1
    let strangerV2
    if (isStrangerV1(rawSearchPayload.stranger)) {
      strangerV1 = rawSearchPayload.stranger
      strangerV2 = rawSearchPayload.user_name
    } else if (isStrangerV2(rawSearchPayload.stranger)) {
      strangerV2 = rawSearchPayload.stranger
      strangerV1 = rawSearchPayload.user_name
    } else {
      throw new Error('stranger neither v1 nor v2!')
    }

    // Issue #1252 : what's wrong here?, Trying to fix now...

    await this.padchatManager.WXAddUser(
      strangerV1 || '',
      strangerV2 || '',
      WXSearchContactTypeStatus.WXID, // default
      hello,
    )
  }

  public async friendshipAccept(
    friendshipId : string,
  ): Promise<void> {
    log.verbose('PuppetPadchat', 'friendshipAccept(%s)', friendshipId)

    const payload = await this.friendshipPayload(friendshipId) as FriendshipPayloadReceive

    console.log('friendshipAccept: ', payload)

    if (!payload.ticket) {
      throw new Error('no ticket')
    }
    if (!payload.stranger) {
      throw new Error('no stranger')
    }

    if (!this.padchatManager) {
      throw new Error('no bridge')
    }

    await this.padchatManager.WXAcceptUser(
      payload.stranger,
      payload.ticket,
    )
  }

  public async friendshipRawPayloadParser(rawPayload: PadchatMessagePayload) : Promise<FriendshipPayload> {
    log.verbose('PuppetPadchat', 'friendshipRawPayloadParser({id=%s})', rawPayload.msg_id)

    const payload: FriendshipPayload = await friendshipRawPayloadParser(rawPayload)
    return payload
  }

  public async friendshipRawPayload(friendshipId: string): Promise<PadchatMessagePayload> {
    log.verbose('PuppetPadchat', 'friendshipRawPayload(%s)', friendshipId)

    const rawPayload = this.cachePadchatFriendshipPayload.get(friendshipId)
    if (!rawPayload) {
      throw new Error('no rawPayload for id ' + friendshipId)
    }

    return rawPayload
  }

}

export default PuppetPadchat
