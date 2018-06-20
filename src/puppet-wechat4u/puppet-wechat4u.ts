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
import LRU from 'lru-cache'

import {
  FileBox,
}             from 'file-box'

import Wechat4u from 'wechat4u'

import { Misc } from '../misc'

import {
  MessagePayload,

  // ContactQueryFilter,
  // ContactGender,
  ContactType,
  ContactPayload,

  FriendshipPayload,
  FriendshipPayloadReceive,
  FriendshipPayloadConfirm,
  FriendshipType,

  RoomPayload,
  RoomMemberPayload,
  // RoomQueryFilter,
}                       from '../puppet/'
import {
  Puppet,
  PuppetOptions,
  Receiver,
}                       from '../puppet/'

import {
  log,
  qrCodeForChatie,
}                       from '../config'

import {
  // WebAppMsgType,

  WebContactRawPayload,
  // WebMessageMediaPayload,
  WebRecomendInfo,

  WebMessageRawPayload,
  // WebMediaType,
  WebMessageType,

  // WebRoomRawMember,
  WebRoomRawPayload,
  WebRoomRawMember,
}                           from './web-schemas'

import {
  messageRawPayloadParser,
}                           from './pure-function-helpers'

export type PuppetFoodType = 'scan' | 'ding'
export type ScanFoodType   = 'scan' | 'login' | 'logout'

// export interface Wechat4uContactRawPayload {
//   name : string,
// }

// export interface WebMessageRawPayload {
//   id   : string,
//   from : string,
//   to   : string,
//   text : string
// }

// export interface Wechat4uRoomRawPayload {
//   topic      : string,
//   memberList : string[],
//   ownerId    : string,
// }

// MemoryCard Slot Name
const MEMORY_SLOT_NAME = 'puppet-wechat4u'

export class PuppetWechat4u extends Puppet {

  /**
   * Wecaht4u
   *
   * Code from:
   * https://github.com/nodeWechat/wechat4u/blob/46931e78bcb56899b8d2a42a37b919e7feaebbef/run-core.js
   *
   */
  private wechat4u: any

  private scanQrCode?: string

  public readonly cacheMessageRawPayload: LRU.Cache<string, WebMessageRawPayload>

  constructor(
    public options: PuppetOptions,
  ) {
    super(options)

    const lruOptions: LRU.Options = {
      max: 10000,
      // length: function (n) { return n * 2},
      dispose: function (key: string, val: Object) {
        log.silly('Puppet', 'constructor() lruOptions.dispose(%s, %s)', key, JSON.stringify(val))
      },
      maxAge: 1000 * 60 * 60,
    }

    this.cacheMessageRawPayload = new LRU<string, WebMessageRawPayload>(lruOptions)
  }

  public async start(): Promise<void> {
    log.verbose('PuppetWechat4u', `start() with ${this.options.memory.name}`)

    this.state.on('pending')

    const syncData = await this.options.memory.get(MEMORY_SLOT_NAME)
    if (syncData) {
      this.wechat4u = new Wechat4u(syncData)
    } else {
      this.wechat4u = new Wechat4u()
    }

    this.initHookEvents(this.wechat4u)

    if (this.wechat4u.PROP.uin) {
      // 存在登录数据时，可以随时调用restart进行重启
      await this.wechat4u.restart()
    } else {
      await this.wechat4u.start()
    }

    // await some tasks...
    this.state.on(true)

  }

  private initHookEvents(wechat4u: any) {
    log.verbose('PuppetWechat4u', 'initHookEvents()')
    /**
     * uuid事件，参数为uuid，根据uuid生成二维码
     */
    this.wechat4u.on('uuid', (uuid: string) => {
      this.scanQrCode = 'https://login.weixin.qq.com/l/' + uuid
      this.emit('scan', this.scanQrCode, 0)
    })
    /**
     * 登录用户头像事件，手机扫描后可以得到登录用户头像的Data URL
     */
    wechat4u.on('user-avatar', (avatarDataUrl: string) => {
      this.emit('scan', this.scanQrCode || '', 200, avatarDataUrl)
    })
    /**
     * 登录成功事件
     */
    wechat4u.on('login', async () => {
      // FIXME: where's the logined user id?
      const userId = this.wechat4u.user.UserName
      if (!userId) {
        this.emit('error', new Error('login event can not found selfId'))
        return
      }
      await this.login(userId)
      // 保存数据，将数据序列化之后保存到任意位置
      await this.options.memory.set(MEMORY_SLOT_NAME, wechat4u.botData)
      await this.options.memory.save()
    })
    /**
     * 登出成功事件
     */
    wechat4u.on('logout', async () => {
      if (this.logonoff()) {
        await this.logout()
      }
      // 清除数据
      await this.options.memory.delete(MEMORY_SLOT_NAME)
      await this.options.memory.save()
    })
    /**
     * 联系人更新事件，参数为被更新的联系人列表
     */
    wechat4u.on('contacts-updated', (contacts: WebContactRawPayload[]) => {
      // Just for memory
      return contacts
      // console.log('contacts.length: ', contacts[0])
      // console.log('联系人数量：', Object.keys(wechat4u.contacts).length)
    })
    /**
     * 错误事件，参数一般为Error对象
     */
    wechat4u.on('error', (err: Error) => {
      this.emit('error', err)
    })

    /**
     * 如何处理会话消息
     */
    wechat4u.on('message', (msg: WebMessageRawPayload) => {

      if (!msg.MsgId) {
        console.log(msg)
        throw new Error('no id')
      }
      this.cacheMessageRawPayload.set(msg.MsgId, msg)

      switch (msg.MsgType) {

        case WebMessageType.STATUSNOTIFY:
          // Skip this internal type
          break

        case WebMessageType.VERIFYMSG:
          this.emit('friendship', msg.MsgId)
          break

        case WebMessageType.SYS:
          if (this.isFriendConfirm(msg.Content)) {
            this.emit('friendship', msg.MsgId)
          }
          this.emit('message', msg.MsgId)
          break

        default:
          this.emit('message', msg.MsgId)
          break
      }
      /**
       * 获取消息时间
       */
      // console.log(`----------${msg.getDisplayTime()}----------`)
      /**
       * 获取消息发送者的显示名
       */
      // console.log(wechat4u.contacts[msg.FromUserName].getDisplayName())
    })
  }

  public async stop(): Promise<void> {
    log.verbose('PuppetWechat4u', 'quit()')

    if (this.state.off()) {
      log.warn('PuppetWechat4u', 'quit() is called on a OFF puppet. await ready(off) and return.')
      await this.state.ready('off')
      return
    }

    this.state.off('pending')

    await this.wechat4u.stop()

    this.state.off(true)
  }

  public async logout(): Promise<void> {
    log.verbose('PuppetWechat4u', 'logout()')

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
    log.verbose('PuppetWechat4u', 'contactAlias(%s, %s)', contactId, alias)

    if (typeof alias === 'undefined') {
      const payload = await this.contactPayload(contactId)
      return payload.alias
    }

    await this.wechat4u.updateRemarkName(contactId, alias)
  }

  public async contactList(): Promise<string[]> {
    log.verbose('PuppetWechat4u', 'contactList()')

    const idList = this.wechat4u.contacts
    .filter((contact: any) => !contact.isRoomContact())
    .map(
      (rawPayload: WebContactRawPayload) => rawPayload.UserName,
    )
    return idList
  }

  public async contactQrcode(contactId: string): Promise<string> {
    if (contactId !== this.selfId()) {
      throw new Error('can not set avatar for others')
    }

    throw new Error('not supported')
    // return await this.bridge.WXqr
  }

  public async contactAvatar(contactId: string)                : Promise<FileBox>
  public async contactAvatar(contactId: string, file: FileBox) : Promise<void>

  public async contactAvatar(contactId: string, file?: FileBox): Promise<void | FileBox> {
    log.verbose('PuppetWechat4u', 'contactAvatar(%s)', contactId)

    if (file) {
      throw new Error('not supported')
    }

    const rawPayload = await this.contactRawPayload(contactId)

    const res = await this.wechat4u.getHeadImg(rawPayload.HeadImgUrl)
    /**
     * 如何获取联系人头像
     */
    return FileBox.fromStream(
      res.data,
      `${contactId}.jpg`, // FIXME
    )
  }

  public async contactRawPayload(id: string): Promise<WebContactRawPayload> {
    log.verbose('PuppetWechat4u', 'contactRawPayload(%s) with contacts.length=%d',
                                  id,
                                  Object.keys(this.wechat4u.contacts).length,
                )

    const rawPayload: WebContactRawPayload = await Misc.retry<WebContactRawPayload>((retry, attempt) => {
      log.verbose('PuppetWechat4u', 'contactRawPayload(%s) retry() attempt=%d', id, attempt)

      if (id in this.wechat4u.contacts) {
        return this.wechat4u.contacts[id]
      }
      retry(new Error('no this.wechat4u.contacts[' + id + ']'))
    })

    return rawPayload

  }

  public async contactRawPayloadParser(
    rawPayload: WebContactRawPayload,
  ): Promise<ContactPayload> {
    log.silly('PuppetWechat4u', 'contactParseRawPayload(Object.keys(payload).length=%d)',
                                    Object.keys(rawPayload).length,
                )
    if (!Object.keys(rawPayload).length) {
      log.error('PuppetWechat4u', 'contactParseRawPayload(Object.keys(payload).length=%d)',
                                    Object.keys(rawPayload).length,
                )
      log.error('PuppetWechat4u', 'contactParseRawPayload() got empty rawPayload!')
      throw new Error('empty raw payload')
      // return {
      //   gender: Gender.Unknown,
      //   type:   Contact.Type.Unknown,
      // }
    }

    // this.id = rawPayload.UserName   // MMActualSender??? MMPeerUserName??? `getUserContact(message.MMActualSender,message.MMPeerUserName).HeadImgUrl`
    // uin:        rawPayload.Uin,    // stable id: 4763975 || getCookie("wxuin")

    return {
      id:         rawPayload.UserName,
      weixin:     rawPayload.Alias,  // Wechat ID
      name:       rawPayload.NickName || '',
      alias:      rawPayload.RemarkName,
      gender:     rawPayload.Sex,
      province:   rawPayload.Province,
      city:       rawPayload.City,
      signature:  rawPayload.Signature,

      address:    rawPayload.Alias, // XXX: need a stable address for user

      star:       !!rawPayload.StarFriend,
      friend:     rawPayload.stranger === undefined
                    ? undefined
                    : !rawPayload.stranger, // assign by injectio.js
      avatar:     rawPayload.HeadImgUrl,
      /**
       * @see 1. https://github.com/Chatie/webwx-app-tracker/blob/7c59d35c6ea0cff38426a4c5c912a086c4c512b2/formatted/webwxApp.js#L3243
       * @see 2. https://github.com/Urinx/WeixinBot/blob/master/README.md
       * @ignore
       */
      // tslint:disable-next-line
      type:      (!!rawPayload.UserName && !rawPayload.UserName.startsWith('@@') && !!(rawPayload.VerifyFlag & 8))
                    ? ContactType.Official
                    : ContactType.Personal,
      /**
       * @see 1. https://github.com/Chatie/webwx-app-tracker/blob/7c59d35c6ea0cff38426a4c5c912a086c4c512b2/formatted/webwxApp.js#L3246
       * @ignore
       */
      // special:       specialContactList.indexOf(rawPayload.UserName) > -1 || /@qqim$/.test(rawPayload.UserName),
    }
  }

  /**
   *
   * Message
   *
   */
  public async messageFile(id: string): Promise<FileBox> {
    log.verbose('PuppetWechat4u', 'messageFile(%s)', id)

    const payload = await this.messagePayload(id)
    const rawPayload = await this.messageRawPayload(id)

    const filename = payload.filename || 'unknown.txt'

    /**
     * 判断消息类型
     */
    switch (rawPayload.MsgType) {
      case this.wechat4u.CONF.MSGTYPE_TEXT:
        /**
         * 文本消息
         */
        throw new Error('msg type is text')

      case this.wechat4u.CONF.MSGTYPE_EMOTICON:
        /**
         * 表情消息
         */
      case this.wechat4u.CONF.MSGTYPE_IMAGE:
        /**
         * 图片消息
         */
        // console.log('图片消息，保存到本地')
        return FileBox.fromStream(
          (await this.wechat4u.getMsgImg(rawPayload.MsgId)).data,
          filename,
        )

      case this.wechat4u.CONF.MSGTYPE_VOICE:
        /**
         * 语音消息
         */
        // console.log('语音消息，保存到本地')
        return FileBox.fromStream(
          (await this.wechat4u.getVoice(rawPayload.MsgId)).data,
          filename,
        )

      case this.wechat4u.CONF.MSGTYPE_VIDEO:
      case this.wechat4u.CONF.MSGTYPE_MICROVIDEO:
        /**
         * 视频消息
         */
        // console.log('视频消息，保存到本地')
        return FileBox.fromStream(
          (await this.wechat4u.getVideo(rawPayload.MsgId)).data,
          filename,
        )

      case this.wechat4u.CONF.MSGTYPE_APP:
        if (rawPayload.AppMsgType === 6) {
          /**
           * 文件消息
           */
          // console.log('文件消息，保存到本地')
          return FileBox.fromStream(
            (await this.wechat4u.getDoc(rawPayload.FromUserName, rawPayload.MediaId, rawPayload.FileName)).data,
            filename,
          )
        }
        break
      default:
        break
    }

    throw new Error('unsupported message. id: ' + id)
  }

  public async messageRawPayload(id: string): Promise<WebMessageRawPayload> {
    log.verbose('PuppetWechat4u', 'messageRawPayload(%s)', id)

    const rawPayload = this.cacheMessageRawPayload.get(id)

    if (!rawPayload) {
      throw new Error('id not found')
    }
    return rawPayload
  }

  public async messageRawPayloadParser(
    rawPayload: WebMessageRawPayload,
  ): Promise<MessagePayload> {
    log.verbose('PuppetWechat4u', 'messageRawPayloadParser(%s) @ %s', rawPayload, this)

    // console.log(rawPayload)
    const payload = messageRawPayloadParser(rawPayload)
    return payload
  }

  public async messageSendText(
    receiver : Receiver,
    text     : string,
  ): Promise<void> {
    log.verbose('PuppetWechat4u', 'messageSend(%s, %s)', receiver, text)

    // room first
    const id = receiver.roomId || receiver.contactId

    if (!id) {
      throw new Error('no id')
    }

    /**
     * 发送文本消息，可以包含emoji(😒)和QQ表情([坏笑])
     */
    await this.wechat4u.sendMsg(text, id)
    /**
     * { BaseResponse: { Ret: 0, ErrMsg: '' },
     *  MsgID: '830582407297708303',
     *  LocalID: '15279119663740094' }
     */
  }

  public async messageSendFile(
    receiver : Receiver,
    file     : FileBox,
  ): Promise<void> {
    log.verbose('PuppetWechat4u', 'messageSend(%s, %s)', receiver, file)

    // room first
    const id = receiver.roomId || receiver.contactId

    if (!id) {
      throw new Error('no id')
    }

    /**
     * 通过表情MD5发送表情
     */
    // wechat4u.sendMsg({
    //   emoticonMd5: '00c801cdf69127550d93ca52c3f853ff'
    // }, ToUserName)
    //   .catch(err => {
    //     bot.emit('error', err)
    //   })

    /**
     * 以下通过上传文件发送图片，视频，附件等
     * 通用方法为入下
     * file为多种类型
     * filename必填，主要为了判断文件类型
     */
    await this.wechat4u.sendMsg({
      file     : await file.toStream(),
      filename : file.name,
    }, id)
  }

  public async messageSendContact(
    receiver  : Receiver,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetWechat4u', 'messageSend("%s", %s)', JSON.stringify(receiver), contactId)
    throw new Error('not support')
  }

  public async messageForward(
    receiver  : Receiver,
    messageId : string,
  ): Promise<void> {
    log.verbose('PuppetWechat4u', 'messageForward(%s, %s)',
                              receiver,
                              messageId,
              )
    const rawPayload = await this.messageRawPayload(messageId)

    if (!rawPayload) {
      throw new Error('no rawPayload')
    }

    const id = receiver.roomId || receiver.contactId

    if (!id) {
      throw new Error('no id')
    }

    /**
     * 如何直接转发消息
     */
    await this.wechat4u.forwardMsg(rawPayload, id)
  }

  /**
   *
   * Room
   *
   */
  public async roomRawPayload(
    id: string,
  ): Promise<WebRoomRawPayload> {
    log.verbose('PuppetWechat4u', 'roomRawPayload(%s)', id)

    const rawPayload: WebRoomRawPayload = await Misc.retry<WebRoomRawPayload>((retry, attempt) => {
      log.verbose('PuppetWechat4u', 'contactRawPayload(%s) retry() attempt=%d', id, attempt)

      if (!this.wechat4u.contacts[id]) {
        retry(new Error('no this.wechat4u.contacts[' + id + ']'))
      }

      return this.wechat4u.contacts[id]
    })

    return rawPayload
  }

  public async roomRawPayloadParser(
    rawPayload: WebRoomRawPayload,
  ): Promise<RoomPayload> {
    log.verbose('PuppetWechat4u', 'roomRawPayloadParser(%s)', rawPayload)

    const id            = rawPayload.UserName
    // const rawMemberList = rawPayload.MemberList || []
    // const memberIdList  = rawMemberList.map(rawMember => rawMember.UserName)

    // const aliasDict = {} as { [id: string]: string | undefined }

    // if (Array.isArray(rawPayload.MemberList)) {
    //   rawPayload.MemberList.forEach(rawMember => {
    //     aliasDict[rawMember.UserName] = rawMember.DisplayName
    //   })
    // }

    const roomPayload: RoomPayload = {
      id,
      topic:      rawPayload.NickName || '',
      // memberIdList,
      // aliasDict,
    }
    return roomPayload
  }

  public async roomList(): Promise<string[]> {
    log.verbose('PuppetWechat4u', 'roomList()')

    const idList = this.wechat4u.contacts
    .filter((contact: any) => contact.isRoomContact())
    .map(
      (rawPayload: WebContactRawPayload) => rawPayload.UserName,
    )
    return idList
  }

  public async roomDel(
    roomId    : string,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetWechat4u', 'roomDel(%s, %s)', roomId, contactId)

    const type = 'delmember'
    this.wechat4u.updateChatroom(roomId, [contactId], type)

  }

  public async roomAvatar(roomId: string): Promise<FileBox> {
    log.verbose('PuppetWechat4u', 'roomAvatar(%s)', roomId)

    const payload = await this.roomPayload(roomId)

    if (payload.avatar) {
      // FIXME: set http headers with cookies
      return FileBox.fromUrl(payload.avatar)
    }
    log.warn('PuppetWechat4u', 'roomAvatar() avatar not found, use the chatie default.')
    return qrCodeForChatie()
  }

  public async roomAdd(
    roomId    : string,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetWechat4u', 'roomAdd(%s, %s)', roomId, contactId)

    // https://github.com/nodeWechat/wechat4u/tree/46931e78bcb56899b8d2a42a37b919e7feaebbef#botupdatechatroomchatroomusername-memberlist-fun
    const type = 'addmember'  // invitemember ???
    this.wechat4u.updateChatroom(roomId, [contactId], type)
  }

  public async roomTopic(roomId: string)                : Promise<string>
  public async roomTopic(roomId: string, topic: string) : Promise<void>

  public async roomTopic(
    roomId: string,
    topic?: string,
  ): Promise<void | string> {
    log.verbose('PuppetWechat4u', 'roomTopic(%s, %s)', roomId, topic)

    if (typeof topic === 'undefined') {
      return 'mock room topic'
    }
    return
  }

  public async roomCreate(
    contactIdList : string[],
    topic         : string,
  ): Promise<string> {
    log.verbose('PuppetWechat4u', 'roomCreate(%s, %s)', contactIdList, topic)

    const roomId = await this.wechat4u.createChatroom(topic, contactIdList)
    return roomId
  }

  public async roomAnnounce(roomId: string)                : Promise<string>
  public async roomAnnounce(roomId: string, text: string)  : Promise<void>

  public async roomAnnounce(roomId: string, text?: string) : Promise<void | string> {
    log.warn('PuppetWechat4u', 'roomAnnounce(%s, %s) not supported', roomId, text ? text : '')

    if (text) {
      return
    }
    return ''
  }

  public async roomQuit(roomId: string): Promise<void> {
    log.verbose('PuppetWechat4u', 'roomQuit(%s)', roomId)
  }

  public async roomQrcode(roomId: string): Promise<string> {
    throw new Error('not support ' + roomId)
  }

  public async roomMemberList(roomId: string) : Promise<string[]> {
    log.verbose('PuppetWechat4u', 'roommemberList(%s)', roomId)
    const rawPayload = await this.roomRawPayload(roomId)

    const memberIdList = (rawPayload.MemberList || [])
                        .map(member => member.UserName)

    return memberIdList
  }

  public async roomMemberRawPayload(roomId: string, contactId: string): Promise<WebRoomRawMember>  {
    log.verbose('PuppetWechat4u', 'roomMemberRawPayload(%s, %s)', roomId, contactId)
    const rawPayload = await this.roomRawPayload(roomId)

    const memberPayloadList = rawPayload.MemberList || []

    const memberPayloadResult = memberPayloadList.filter(payload => payload.UserName === contactId)
    if (memberPayloadResult.length > 0) {
      return memberPayloadResult[0]
    } else {
      throw new Error('not found')
    }
  }

  public async roomMemberRawPayloadParser(rawPayload: WebRoomRawMember): Promise<RoomMemberPayload>  {
    log.verbose('PuppetWechat4u', 'roomMemberRawPayloadParser(%s)', rawPayload)

    const payload: RoomMemberPayload = {
      id        : rawPayload.UserName,
      roomAlias : rawPayload.DisplayName,
    }
    return payload
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
    log.verbose('PuppetWechat4u', 'friendshipVerify(%s, %s)', contactId, hello)

    await this.wechat4u.addFriend(contactId, hello)
  }

  public async friendshipAccept(
    friendshipId : string,
  ): Promise<void> {
    log.verbose('PuppetWechat4u', 'friendshipAccept(%s)', friendshipId)

    const payload = await this.friendshipPayload(friendshipId) as FriendshipPayloadReceive
    await this.wechat4u.verifyUser(payload.contactId, payload.ticket)
  }

  public async friendshipRawPayload(id: string)            : Promise<any> {
    log.verbose('PuppetWechat4u', 'friendshipRawPayload(%s)', id)

    const rawPayload = this.cacheMessageRawPayload.get(id)
    if (!rawPayload) {
      throw new Error('no rawPayload')
    }

    return rawPayload
  }

  public async friendshipRawPayloadParser(rawPayload: any) : Promise<FriendshipPayload> {
    log.verbose('PuppetWechat4u', 'friendshipRawPayloadParser(%s)', rawPayload)

    switch (rawPayload.MsgType) {
      case WebMessageType.VERIFYMSG:
        if (!rawPayload.RecommendInfo) {
          throw new Error('no RecommendInfo')
        }
        const recommendInfo: WebRecomendInfo = rawPayload.RecommendInfo

        if (!recommendInfo) {
          throw new Error('no recommendInfo')
        }

        const payloadReceive: FriendshipPayloadReceive = {
          id        : rawPayload.MsgId,
          contactId : recommendInfo.UserName,
          hello     : recommendInfo.Content,
          ticket    : recommendInfo.Ticket,
          type      : FriendshipType.Receive,
        }
        return payloadReceive

      case WebMessageType.SYS:
        const payloadConfirm: FriendshipPayloadConfirm = {
          id        : rawPayload.MsgId,
          contactId : rawPayload.FromUserName,
          type      : FriendshipType.Confirm,
        }
        return payloadConfirm

      default:
        throw new Error('not supported friend request message raw payload')
    }
  }

  public async ding(data?: string): Promise<void> {
    log.silly('PuppetWechat4u', 'ding(%s)', data || '')

    this.emit('dong', data)
    return
  }

  private isFriendConfirm(
    text: string,
  ): boolean {
    const friendConfirmRegexpList = [
      /^You have added (.+) as your WeChat contact. Start chatting!$/,
      /^你已添加了(.+)，现在可以开始聊天了。$/,
      /^(.+) just added you to his\/her contacts list. Send a message to him\/her now!$/,
      /^(.+)刚刚把你添加到通讯录，现在可以开始聊天了。$/,
    ]

    let found = false

    friendConfirmRegexpList.some(re => !!(found = re.test(text)))

    return found
  }

}

export default PuppetWechat4u
