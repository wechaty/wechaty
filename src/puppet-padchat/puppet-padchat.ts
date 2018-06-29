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
  ContactType,
  ContactGender,
}                                 from 'wechaty-puppet'

import {
  contactRawPayloadParser,

  fileBoxToQrcode,

  friendshipRawPayloadParser,
  friendshipConfirmEventMessageParser,
  friendshipReceiveEventMessageParser,
  friendshipVerifyEventMessageParser,

  isStrangerV1,
  isStrangerV2,

  messageRawPayloadParser,

  roomRawPayloadParser,
  roomJoinEventMessageParser,
  roomLeaveEventMessageParser,
  roomTopicEventMessageParser,

  generateFakeSelfBot,
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
}                       from './padchat-manager'

import {
  PadchatContactPayload,
  PadchatMessagePayload,
  PadchatRoomPayload,
  PadchatRoomMemberPayload,
  PadchatMessageType,
}                           from './padchat-schemas'

import {
  WXSearchContactTypeStatus,
}                           from './padchat-rpc.type'

let PADCHAT_COUNTER = 0 // PuppetPadchat Instance Counter

export class PuppetPadchat extends Puppet {

  private padchatCounter: number
  private readonly cachePadchatMessagePayload: LRU.Cache<string, PadchatMessagePayload>

  private padchatManager?      : PadchatManager

  constructor(
    public options: PuppetOptions,
  ) {
    super({
      timeout: 60 * 4,  // Default set timeout to 4 minutes for PuppetPadchat
      ...options,
    })

    const lruOptions: LRU.Options = {
      max: 1000,
      // length: function (n) { return n * 2},
      dispose: function (key: string, val: any) {
        log.silly('PuppetPadchat', 'constructor() lruOptions.dispose(%s, %s)', key, JSON.stringify(val))
      },
      maxAge: 1000 * 60 * 60,
    }

    this.cachePadchatMessagePayload = new LRU<string, PadchatMessagePayload>(lruOptions)

    this.padchatCounter = PADCHAT_COUNTER++

    if (this.padchatCounter > 0) {
      if (!this.options.token) {
        throw new Error([
          'You need to specify `token` when constructor PuppetPadchat becasue you have more than one instance. ',
          'see: https://github.com/Chatie/wechaty/issues/1367',
        ].join(''))
      }
    }
  }

  public toString() {
    const text = super.toString()
    return text + `/PuppetPadchat#${this.padchatCounter}`
  }

  public ding(data?: string): void {
    log.verbose('PuppetPadchat', 'ding(%s)', data || '')

    // TODO: do some internal health check inside this.padchatManager
    if (!this.padchatManager) {
      this.emit('error', new Error('no padchat Manager'))
      return
    }
    this.padchatManager.ding(data)
    return
  }

  public startWatchdog(): void {
    log.verbose('PuppetPadchat', 'startWatchdog()')

    if (!this.padchatManager) {
      throw new Error('no padchat manager')
    }

    // clean the dog because this could be re-inited
    this.watchdog.removeAllListeners()

    /**
     * Use manager's heartbeat to feed dog
     */
    this.padchatManager.on('heartbeat', (data: string) => {
      log.silly('PuppetPadchat', 'startWatchdog() padchatManager.on(heartbeat)')
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
      await this.reset('watchdog.on(reset)')
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

    const manager = this.padchatManager = new PadchatManager({
      endpoint : this.options.endpoint  || WECHATY_PUPPET_PADCHAT_ENDPOINT,
      memory   : this.options.memory,
      token    : this.options.token     || padchatToken(),
    })

    await this.startManager(manager)
    await this.startWatchdog()

    this.state.on(true)
    this.emit('start')
  }

  protected async login(selfId: string): Promise<void> {
    if (!this.padchatManager) {
      throw new Error('no padchat manager')
    }
    await super.login(selfId)
    await this.padchatManager.syncContactsAndRooms()
  }

  public async startManager(manager: PadchatManager): Promise<void> {
    log.verbose('PuppetPadchat', 'startManager()')

    if (this.state.off()) {
      throw new Error('startManager() state is off')
    }

    manager.removeAllListeners()
    // manager.on('error'    , e => this.emit('error', e))
    manager.on('scan',    (qrcode: string, status: number, data?: string) => this.emit('scan', qrcode, status, data))
    manager.on('login',   (userId: string)                                => this.login(userId))
    manager.on('message', (rawPayload: PadchatMessagePayload)             => this.onPadchatMessage(rawPayload))
    manager.on('logout',  ()                                              => this.logout())
    manager.on('dong',  (data)                                            => this.emit('dong', data))

    manager.on('reset', async reason => {
      log.warn('PuppetPadchat', 'startManager() manager.on(reset) for %s. Restarting PuppetPadchat ... ', reason)
      await this.reset(reason)
    })

    await manager.start()
  }

  protected async reset(reason: string): Promise<void> {
    log.verbose('PuppetPadchat', 'reset(%s)', reason)

    try {
      log.silly('PuppetPadchat', 'reset() before stop')
      await this.stop()
      log.silly('PuppetPadchat', 'reset() after stop')
      await this.start()
      log.silly('PuppetPadchat', 'reset() after start')
    } catch (e) {
      log.error('PuppetPadchat', 'reset() exception: %s', e.message)
      this.emit('error', e)
      throw e
    }

    log.silly('PuppetPadchat', 'reset() done')
  }

  protected async onPadchatMessage(rawPayload: PadchatMessagePayload): Promise<void> {
    log.verbose('PuppetPadchat', 'onPadchatMessage({id=%s, type=%s(%s)})',
                                rawPayload.msg_id,
                                PadchatMessageType[rawPayload.sub_type],
                                rawPayload.msg_type,
              )
    /**
     * 0. Discard messages when not logged in
     */
    if (!this.id) {
      log.warn('PuppetPadchat', 'onPadchatMessage(%s) discarded message because puppet is not logged-in', JSON.stringify(rawPayload))
      return
    }

    /**
     * 1. Sometimes will get duplicated same messages from rpc, drop the same message from here.
     */
    if (this.cachePadchatMessagePayload.has(rawPayload.msg_id)) {
      log.silly('PuppetPadchat', 'onPadchatMessage(id=%s) duplicate message: %s',
                                rawPayload.msg_id,
                                JSON.stringify(rawPayload).substr(0, 500),
              )
      return
    }

    /**
     * 2. Save message for future usage
     */
    this.cachePadchatMessagePayload.set(
      rawPayload.msg_id,
      rawPayload,
    )

    // console.log('rawPayload:', rawPayload)

    /**
     * 3. Check for Different Message Types
     */
    switch (rawPayload.sub_type) {
      case PadchatMessageType.VerifyMsg:
        this.emit('friendship', rawPayload.msg_id)
        break

      case PadchatMessageType.Recalled:
        /**
         * When someone joined the room invited by Bot,
         * the bot will receive a `recall-able` message for room event
         *
         * { content: '12740017638@chatroom:\n<sysmsg type="delchatroommember">\n\t<delchatroommember>\n\t\t<plain>
         *            <![CDATA[You invited 卓桓、Zhuohuan, 太阁_传话助手, 桔小秘 to the group chat.   ]]></plain>...,
         *  sub_type: 10002}
         */
        await Promise.all([
          this.onPadchatMessageRoomEventJoin(rawPayload),
        ])
        break
      case PadchatMessageType.Sys:
        await Promise.all([
          this.onPadchatMessageFriendshipEvent(rawPayload),
          ////////////////////////////////////////////////
          this.onPadchatMessageRoomEventJoin(rawPayload),
          this.onPadchatMessageRoomEventLeave(rawPayload),
          this.onPadchatMessageRoomEventTopic(rawPayload),
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
        this.emit('message', rawPayload.msg_id)
        break
    }
  }

  /**
   * Look for room join event
   */
  protected async onPadchatMessageRoomEventJoin(rawPayload: PadchatMessagePayload): Promise<void> {
    log.verbose('PuppetPadchat', 'onPadchatMessageRoomEventJoin({id=%s})', rawPayload.msg_id)

    const roomJoinEvent = roomJoinEventMessageParser(rawPayload)

    if (roomJoinEvent) {
      const inviteeNameList = roomJoinEvent.inviteeNameList
      const inviterName     = roomJoinEvent.inviterName
      const roomId          = roomJoinEvent.roomId
      log.silly('PuppetPadchat', 'onPadchatMessageRoomEventJoin() roomJoinEvent="%s"', JSON.stringify(roomJoinEvent))

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
         * Set Cache Dirty
         */
        await this.roomMemberPayloadDirty(roomId)

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
  }

  /**
   * Look for room leave event
   */
  protected async onPadchatMessageRoomEventLeave(rawPayload: PadchatMessagePayload): Promise<void> {
    log.verbose('PuppetPadchat', 'onPadchatMessageRoomEventLeave({id=%s})', rawPayload.msg_id)

    const roomLeaveEvent = roomLeaveEventMessageParser(rawPayload)

    if (roomLeaveEvent) {
      const leaverNameList = roomLeaveEvent.leaverNameList
      const removerName    = roomLeaveEvent.removerName
      const roomId         = roomLeaveEvent.roomId
      log.silly('PuppetPadchat', 'onPadchatMessageRoomEventLeave() roomLeaveEvent="%s"', JSON.stringify(roomLeaveEvent))

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

      if (!this.padchatManager) {
        throw new Error('no padchatManager')
      }

      /**
       * Set Cache Dirty
       */
      await this.roomMemberPayloadDirty(roomId)
      await this.roomPayloadDirty(roomId)

      this.emit('room-leave',  roomId, leaverIdList, removerId)
    }
  }

  /**
   * Look for room topic event
   */
  protected async onPadchatMessageRoomEventTopic(rawPayload: PadchatMessagePayload): Promise<void> {
    log.verbose('PuppetPadchat', 'onPadchatMessageRoomEventTopic({id=%s})', rawPayload.msg_id)

    const roomTopicEvent = roomTopicEventMessageParser(rawPayload)

    if (roomTopicEvent) {
      const changerName = roomTopicEvent.changerName
      const newTopic    = roomTopicEvent.topic
      const roomId      = roomTopicEvent.roomId
      log.silly('PuppetPadchat', 'onPadchatMessageRoomEventTopic() roomTopicEvent="%s"', JSON.stringify(roomTopicEvent))

      const roomOldPayload = await this.roomPayload(roomId)
      const oldTopic       = roomOldPayload.topic

      const changerIdList = await this.roomMemberSearch(roomId, changerName)
      if (changerIdList.length < 1) {
        throw new Error('no changerId found')
      } else if (changerIdList.length > 1) {
        log.warn('PuppetPadchat', 'onPadchatMessage() case PadchatMesssageSys: changerId found more than 1, use the first one.')
      }
      const changerId = changerIdList[0]

      if (!this.padchatManager) {
        throw new Error('no padchatManager')
      }
      /**
       * Set Cache Dirty
       */
      await this.roomPayloadDirty(roomId)

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
      throw new Error('no padchat manager')
    }

    if (this.state.off()) {
      log.warn('PuppetPadchat', 'stop() is called on a OFF puppet. await ready(off) and return.')
      await this.state.ready('off')
      return
    }

    this.state.off('pending')

    this.watchdog.sleep()
    await this.logout()

    await this.padchatManager.stop()

    this.padchatManager.removeAllListeners()
    this.padchatManager = undefined

    this.state.off(true)
    this.emit('stop')
  }

  public async logout(): Promise<void> {
    log.verbose('PuppetPadchat', 'logout()')

    if (!this.id) {
      log.warn('PuppetPadchat', 'logout() this.id not exist')
      return
    }

    if (!this.padchatManager) {
      throw new Error('no padchat manager')
    }

    this.emit('logout', this.id) // becore we will throw above by logonoff() when this.user===undefined
    this.id = undefined

    // TODO
    // if (!passive) {
    //   await this.padchatManager.WXLogout()
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
      throw new Error('no padchat manager')
    }

    await this.padchatManager.WXSetUserRemark(contactId, alias || '')

    return
  }

  public async contactValidate(contactId: string): Promise<boolean> {
    log.verbose('PuppetPadchat', 'contactValid(%s)', contactId)

    if (!this.padchatManager) {
      throw new Error('no padchat manager')
    }

    const rawPayload = await this.padchatManager.contactRawPayload(contactId)

    if (rawPayload && rawPayload.user_name) {
      // check user_name too becasue the server might return {}
      return true
    }

    return false
  }

  public async contactList(): Promise<string[]> {
    log.verbose('PuppetPadchat', 'contactList()')

    if (!this.padchatManager) {
      throw new Error('no padchat manager')
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
        throw new Error('no padchat manager')
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

    const fileBox = FileBox.fromUrl(
      payload.avatar,
      `wechaty-contact-avatar-${payload.name}.jpg`,
    )
    return fileBox
  }

  public async contactQrcode(contactId: string): Promise<string> {
    log.verbose('PuppetPadchat', 'contactQrcode(%s)', contactId)

    if (contactId !== this.selfId()) {
      throw new Error('can not set avatar for others')
    }
    if (!this.padchatManager) {
      throw new Error('no padchat manager')
    }

    const base64 = await this.padchatManager.WXGetUserQRCode(contactId, 0)

    const contactPayload = await this.contactPayload(contactId)
    const contactName    = contactPayload.alias || contactPayload.name || contactPayload.id
    const fileBox        = FileBox.fromBase64(base64, `${contactName}.jpg`)

    const qrcode = await fileBoxToQrcode(fileBox)

    return qrcode
  }

  public async contactPayloadDirty(contactId: string): Promise<void> {
    log.verbose('PuppetPadchat', 'contactPayloadDirty(%s)', contactId)

    if (this.padchatManager) {
      this.padchatManager.contactRawPayloadDirty(contactId)
    }

    await super.contactPayloadDirty(contactId)
  }

  public async contactRawPayload(contactId: string): Promise<PadchatContactPayload> {
    log.silly('PuppetPadchat', 'contactRawPayload(%s)', contactId)

    if (!this.id) {
      throw Error('bot not login!')
    }

    if (!this.padchatManager) {
      throw new Error('no padchat manager')
    }
    const rawPayload = await this.padchatManager.contactRawPayload(contactId)

    if (!rawPayload.user_name && contactId === this.id) {
      return generateFakeSelfBot(contactId)
    }

    return rawPayload
  }

  public async contactRawPayloadParser(rawPayload: PadchatContactPayload): Promise<ContactPayload> {
    log.silly('PuppetPadchat', 'contactRawPayloadParser({user_name="%s"})', rawPayload.user_name)

    const payload: ContactPayload = contactRawPayloadParser(rawPayload)

    if (rawPayload.stranger && isStrangerV1(rawPayload.stranger)) {
      payload.friend = true
    } else {
      payload.friend = false
    }

    // if (!this.padchatManager) {
    //   throw new Error('no padchat manager')
    // }

    // const searchResult = await this.padchatManager.WXSearchContact(rawPayload.user_name)

    // let friend: undefined | boolean = undefined

    // if (searchResult) {
    //   if (searchResult.status === -24 && !searchResult.user_name) {
    //     friend = false
    //   } else if (  isStrangerV1(searchResult.user_name)
    //             || isStrangerV2(searchResult.user_name)
    //   ) {
    //     friend = false
    //   }
    // }

    // return {
    //   ...payload,
    //   friend,
    // }

    return payload
  }

  /**
   * Overwrite the Puppet.contactPayload()
   */
  public async contactPayload(
    contactId: string,
  ): Promise<ContactPayload> {

    try {
      const payload = await super.contactPayload(contactId)
      return payload
    } catch (e) {
      log.silly('PuppetPadchat', 'contactPayload(%s) exception: %s', contactId, e.message)
      log.silly('PuppetPadchat', 'contactPayload(%s) get failed for %s, try load from room member data source', contactId)
    }

    const rawPayload = await this.contactRawPayload(contactId)

    /**
     * Issue #1397
     *  https://github.com/Chatie/wechaty/issues/1397#issuecomment-400962638
     *
     * Try to use the contact information from the room
     * when it is not available directly
     */
    if (!rawPayload || Object.keys(rawPayload).length <= 0) {
      log.silly('PuppetPadchat', 'contactPayload(%s) rawPayload not exist', contactId)

      const roomList = await this.contactRoomList(contactId)
      log.silly('PuppetPadchat', 'contactPayload(%s) found %d rooms', contactId, roomList.length)

      if (roomList.length > 0) {
        const roomId = roomList[0]
        const roomMemberPayload = await this.roomMemberPayload(roomId, contactId)
        if (roomMemberPayload) {

          const payload: ContactPayload = {
            avatar : roomMemberPayload.avatar,
            name   : roomMemberPayload.name,
            id     : roomMemberPayload.id,
            gender : ContactGender.Unknown,
            type   : ContactType.Personal,
          }

          this.cacheContactPayload.set(contactId, payload)
          log.silly('PuppetPadchat', 'contactPayload(%s) cache SET', contactId)

          return payload
        }
      }
      throw new Error('no raw payload')
    }

    return await this.contactRawPayloadParser(rawPayload)
  }

  /**
   *
   * Message
   *
   */
  public async messageFile(messageId: string): Promise<FileBox> {
    log.warn('PuppetPadchat', 'messageFile(%s)', messageId)

    if (!this.padchatManager) {
      throw new Error('no padchat manager')
    }

    const rawPayload = await this.messageRawPayload(messageId)
    const payload    = await this.messagePayload(messageId)

    const rawText        = JSON.stringify(rawPayload)
    const attachmentName = payload.filename || payload.id

    let result

    switch (payload.type) {
      case MessageType.Audio:
        result = await this.padchatManager.WXGetMsgVoice(rawText)
        console.log(result)
        return FileBox.fromBase64(result.voice, `${attachmentName}.slk`)

      case MessageType.Emoticon:
        result = await this.padchatManager.WXGetMsgEmoticon(rawText)
        console.log(result)
        return FileBox.fromBase64(result.image, `${attachmentName}.gif`)

      case MessageType.Image:
        result = await this.padchatManager.WXGetMsgImage(rawText)
        console.log(result)
        return FileBox.fromBase64(result.image, `${attachmentName}.jpg`)

      case MessageType.Video:
        result = await this.padchatManager.WXGetMsgVideo(rawText)
        console.log(result)
        return FileBox.fromBase64(result.video, `${attachmentName}.mp4`)

      case MessageType.Attachment:
      default:
        log.warn('PuppetPadchat', 'messageFile(%s) unsupport type: %s(%s) because it is not fully implemented yet, PR is welcome.',
                                  messageId,
                                  PadchatMessageType[rawPayload.sub_type],
                                  rawPayload.sub_type,
                )
        const base64 = 'Tm90IFN1cHBvcnRlZCBBdHRhY2htZW50IEZpbGUgVHlwZSBpbiBNZXNzYWdlLgpTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9DaGF0aWUvd2VjaGF0eS9pc3N1ZXMvMTI0OQo='
        const filename = 'wechaty-puppet-padchat-message-attachment-' + messageId + '.txt'

        const file = FileBox.fromBase64(
          base64,
          filename,
        )

        return file
    }
  }

  public async messageRawPayload(id: string): Promise<PadchatMessagePayload> {
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

    // Send to the Room if there's a roomId
    const id = receiver.roomId || receiver.contactId

    if (!id) {
      throw Error('no id')
    }
    if (!this.padchatManager) {
      throw new Error('no padchat manager')
    }
    await this.padchatManager.WXSendMsg(id, text)
  }

  public async messageSendFile(
    receiver : Receiver,
    file     : FileBox,
  ): Promise<void> {
    log.verbose('PuppetPadchat', 'messageSend("%s", %s)', JSON.stringify(receiver), file)

    // Send to the Room if there's a roomId
    const id = receiver.roomId || receiver.contactId

    if (!id) {
      throw new Error('no id!')
    }

    if (!this.padchatManager) {
      throw new Error('no padchat manager')
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
      throw new Error('no padchat manager')
    }

    // Send to the Room if there's a roomId
    const id = receiver.roomId || receiver.contactId

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
  public async roomMemberPayloadDirty(roomId: string) {
    log.silly('PuppetPadchat', 'roomMemberRawPayloadDirty(%s)', roomId)

    if (this.padchatManager) {
      await this.padchatManager.roomMemberRawPayloadDirty(roomId)
    }

    await super.roomMemberPayloadDirty(roomId)
  }

  public async roomMemberRawPayload(
    roomId    : string,
    contactId : string,
  ): Promise<PadchatRoomMemberPayload> {
    log.silly('PuppetPadchat', 'roomMemberRawPayload(%s)', roomId)

    if (!this.padchatManager) {
      throw new Error('no padchat manager')
    }

    const memberDictRawPayload = await this.padchatManager.roomMemberRawPayload(roomId)

    return memberDictRawPayload[contactId]
  }

  public async roomMemberRawPayloadParser(
    rawPayload: PadchatRoomMemberPayload,
  ): Promise<RoomMemberPayload> {
    log.silly('PuppetPadchat', 'roomMemberRawPayloadParser(%s)', rawPayload)

    const payload: RoomMemberPayload = {
      id        : rawPayload.user_name,
      inviterId : rawPayload.invited_by,
      roomAlias : rawPayload.chatroom_nick_name,
      avatar    : rawPayload.big_head,
      name      : rawPayload.nick_name,
    }

    return payload
  }

  public async roomPayloadDirty(roomId: string): Promise<void> {
    log.verbose('PuppetPadchat', 'roomPayloadDirty(%s)', roomId)

    if (this.padchatManager) {
      this.padchatManager.roomRawPayloadDirty(roomId)
    }

    await super.roomPayloadDirty(roomId)
  }

  public async roomRawPayload(
    roomId: string,
  ): Promise<PadchatRoomPayload> {
    log.verbose('PuppetPadchat', 'roomRawPayload(%s)', roomId)

    if (!this.padchatManager) {
      throw new Error('no padchat manager')
    }

    const rawPayload = await this.padchatManager.roomRawPayload(roomId)
    return rawPayload
  }

  public async roomRawPayloadParser(rawPayload: PadchatRoomPayload): Promise<RoomPayload> {
    log.verbose('PuppetPadchat', 'roomRawPayloadParser(rawPayload.user_name="%s")', rawPayload.user_name)

    const payload: RoomPayload = roomRawPayloadParser(rawPayload)
    return payload
  }

  public async roomMemberList(roomId: string): Promise<string[]> {
    log.verbose('PuppetPadchat', 'roomMemberList(%s)', roomId)

    if (!this.padchatManager) {
      throw new Error('no padchat manager')
    }

    const memberIdList = await this.padchatManager.getRoomMemberIdList(roomId)
    log.silly('PuppetPadchat', 'roomMemberList()=%d', memberIdList.length)

    return memberIdList
  }

  public async roomValidate(roomId: string): Promise<boolean> {
    log.verbose('PuppetPadchat', 'roomValid(%s)', roomId)
    if (!this.padchatManager) {
      throw new Error('no padchat manager')
    }
    const exist = await this.padchatManager.WXGetChatRoomMember(roomId)
    return !!exist
  }

  public async roomList(): Promise<string[]> {
    log.verbose('PuppetPadchat', 'roomList()')

    if (!this.padchatManager) {
      throw new Error('no padchat manager')
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
      throw new Error('no padchat manager')
    }

    const memberIdList = await this.roomMemberList(roomId)
    if (memberIdList.includes(contactId)) {
      await this.padchatManager.WXDeleteChatRoomMember(roomId, contactId)
    } else {
      log.warn('PuppetPadchat', 'roomDel() room(%s) has no member contact(%s)', roomId, contactId)
    }

    /**
     * Should not dirty payload at here,
     * because later we need to get the leaverId from the event.
     * We will dirty the payload when we process the leave event.
     * Issue #1329 - https://github.com/Chatie/wechaty/issues/1329
     */
    // await this.roomMemberPayloadDirty(roomId)
  }

  public async roomQrcode(roomId: string): Promise<string> {
    log.verbose('PuppetPadchat', 'roomQrcode(%s)', roomId)

    const memberIdList = await this.roomMemberList(roomId)
    if (!memberIdList.includes(this.selfId())) {
      throw new Error('userSelf not in this room: ' + roomId)
    }

    const base64 = await this.padchatManager!.WXGetUserQRCode(roomId, 0)

    const roomPayload = await this.roomPayload(roomId)
    const roomName    = roomPayload.topic || roomPayload.id
    const fileBox     = FileBox.fromBase64(base64, `${roomName}-qrcode.jpg`)

    const qrcode = await fileBoxToQrcode(fileBox)

    return qrcode
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
      throw new Error('no padchat manager')
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

    // Reload room information here
    await new Promise(r => setTimeout(r, 1000))
    await this.roomMemberPayloadDirty(roomId)
    await this.roomMemberPayload(roomId, contactId)
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
      throw new Error('no padchat manager')
    }

    await this.padchatManager.WXSetChatroomName(roomId, topic)
    /**
     * Give server some time to refresh the API payload
     * when we have to make sure the data is the latest.
     */
    await new Promise(r => setTimeout(r, 1000))
    await this.roomPayloadDirty(roomId)
    await this.roomPayload(roomId)

    return
  }

  public async roomCreate(
    contactIdList : string[],
    topic         : string,
  ): Promise<string> {
    log.verbose('PuppetPadchat', 'roomCreate(%s, %s)', contactIdList, topic)

    if (!this.padchatManager) {
      throw new Error('no padchat manager')
    }

    const roomId = await this.padchatManager.WXCreateChatRoom(contactIdList)

    // Load new created room payload
    await this.roomPayload(roomId)

    return roomId
  }

  public async roomQuit(roomId: string): Promise<void> {
    log.verbose('PuppetPadchat', 'roomQuit(%s)', roomId)

    if (!this.padchatManager) {
      throw new Error('no padchat manager')
    }

    await this.padchatManager.WXQuitChatRoom(roomId)

    // Clean Cache
    await this.roomMemberPayloadDirty(roomId)
    await this.roomPayloadDirty(roomId)
  }

  public async roomAnnounce(roomId: string)             : Promise<string>
  public async roomAnnounce(roomId: string, text: string) : Promise<void>

  public async roomAnnounce(roomId: string, text?: string): Promise<void | string> {
    log.verbose('PuppetPadchat', 'roomAnnounce(%s, %s)', roomId, text ? text : '')

    if (!this.padchatManager) {
      throw new Error('no padchat manager')
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
  public async friendshipAdd(
    contactId : string,
    hello     : string,
  ): Promise<void> {
    log.verbose('PuppetPadchat', 'friendshipAdd(%s, %s)', contactId, hello)

    if (!this.padchatManager) {
      throw new Error('no padchat manager')
    }

    const rawSearchPayload = await this.padchatManager.WXSearchContact(contactId)

    /**
     * If the contact is not stranger, than ussing WXSearchContact can get user_name
     */
    if (rawSearchPayload.user_name !== '' && !isStrangerV1(rawSearchPayload.user_name) && !isStrangerV2(rawSearchPayload.user_name)) {
      log.warn('PuppetPadchat', 'friendshipAdd %s has been friend with bot, no need to send friend request!', contactId)
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

    if (!payload.ticket) {
      throw new Error('no ticket')
    }
    if (!payload.stranger) {
      throw new Error('no stranger')
    }

    if (!this.padchatManager) {
      throw new Error('no padchat manager')
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

    /**
     * Friendship shares Cache with the Message RawPayload
     */
    const rawPayload = this.cachePadchatMessagePayload.get(friendshipId)
    if (!rawPayload) {
      throw new Error('no rawPayload for id ' + friendshipId)
    }

    return rawPayload
  }

}

export default PuppetPadchat
