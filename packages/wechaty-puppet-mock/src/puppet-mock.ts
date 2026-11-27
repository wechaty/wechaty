/**
 * `PuppetMock`: a Wechaty puppet provider with no IM behind it. Every puppet
 * method answers from an in-memory `Mocker` (contacts, rooms, messages), so
 * tests and examples can drive a bot without a real account. Methods with
 * nothing to mock log their call and return an empty result.
 */
/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2018 Huan Li <huan@chatie.io>
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
import * as PUPPET  from 'wechaty-puppet'
import {
  FileBox,
  type FileBoxInterface,
}                     from 'file-box'

import {
  CHATIE_OFFICIAL_ACCOUNT_QRCODE,
  qrCodeForChatie,
  VERSION,
  NAME,
  log,
}                                   from './config.ts'
import { WECHATY_ICON_PNG_BASE64 } from './mock/default-avatar.ts'


import {
  Mocker,
  // ContactMock,
}                     from './mock/mod.ts'

export type PuppetMockOptions = PUPPET.PuppetOptions & {
  mocker?: Mocker,
}

class PuppetMock extends PUPPET.Puppet {

  static override readonly VERSION = VERSION

  private loopTimer?: ReturnType<typeof setTimeout>

  mocker: Mocker

  // `declare`: Puppet's constructor stores `options`; this only narrows its type.
  declare options: PuppetMockOptions

  constructor (
    options: PuppetMockOptions = {},
  ) {
    super(options)
    log.verbose('PuppetMock', 'constructor()')

    if (options.mocker) {
      log.verbose('PuppetMock', 'constructor() use options.mocker')
      this.mocker = options.mocker
    } else {
      log.verbose('PuppetMock', 'constructor() creating the default mocker')
      this.mocker = new Mocker()
      // this.mocker.use(SimpleBehavior())
    }
    this.mocker.puppet = this
  }

  override name ()    { return `${NAME}<${super.name()}>` }
  override version () { return `${VERSION}<${super.version()}>` }

  /** Start the mock environment after Puppet reaches running. */
  override async onStart (signal?: AbortSignal): Promise<void> {
    log.verbose('PuppetMock', 'onStart()')
    setTimeout(() => {
      if (!signal?.aborted) {
        this.mocker.start()
      }
    }, 0)
  }

  override async onStop (): Promise<void> {
    log.verbose('PuppetMock', 'onStop()')

    if (this.loopTimer) {
      clearInterval(this.loopTimer)
    }

    setTimeout(() => this.mocker.stop(), 0)
  }

  override ding (data?: string): void {
    log.silly('PuppetMock', 'ding(%s)', data || '')
    setTimeout(() => this.dispatchEvent(new PUPPET.WechatyEvent('dong', {
      detail: { data: data || '' },
    })), 1000)
  }

  /**
   *
   * ContactSelf
   *
   *
   */
  override async contactSelfQRCode (): Promise<string> {
    log.verbose('PuppetMock', 'contactSelfQRCode()')
    if (!this.isLoggedIn) {
      return CHATIE_OFFICIAL_ACCOUNT_QRCODE
    }
    return `${CHATIE_OFFICIAL_ACCOUNT_QRCODE}?id=${encodeURIComponent(this.currentUserId)}`
  }

  override async contactSelfName (name: string): Promise<void> {
    log.verbose('PuppetMock', 'contactSelfName(%s)', name)
    if (!this.isLoggedIn) {
      throw new Error('not logged in')
    }
    const payload = this.mocker.contactPayload(this.currentUserId)
    payload.name = name
    await this.contactPayloadDirty(this.currentUserId)
  }

  override async contactSelfSignature (signature: string): Promise<void> {
    log.verbose('PuppetMock', 'contactSelfSignature(%s)', signature)
    if (!this.isLoggedIn) {
      throw new Error('not logged in')
    }
    const payload = this.mocker.contactPayload(this.currentUserId)
    payload.signature = signature
    await this.contactPayloadDirty(this.currentUserId)
  }

  /**
   *
   * Contact
   *
   */
  override contactAlias (contactId: string)                      : Promise<string>
  override contactAlias (contactId: string, alias: string | null): Promise<void>

  override async contactAlias (contactId: string, alias?: string | null): Promise<void | string> {
    log.verbose('PuppetMock', 'contactAlias(%s, %s)', contactId, alias)
    const payload = this.mocker.contactPayload(contactId)

    if (typeof alias === 'undefined') {
      return payload.alias ?? ''
    }
    payload.alias = alias ?? undefined
    await this.contactPayloadDirty(contactId)
  }

  override async contactPhone (contactId: string): Promise<string[]>
  override async contactPhone (contactId: string, phoneList: string[]): Promise<void>

  override async contactPhone (contactId: string, phoneList?: string[]): Promise<string[] | void> {
    log.verbose('PuppetMock', 'contactPhone(%s, %s)', contactId, phoneList)
    const payload = this.mocker.contactPayload(contactId)
    if (typeof phoneList === 'undefined') {
      return payload.phone ?? []
    }
    payload.phone = [...phoneList]
    await this.contactPayloadDirty(contactId)
  }

  override async contactCorporationRemark (contactId: string, corporationRemark: string | null) {
    log.verbose('PuppetMock', 'contactCorporationRemark(%s, %s)', contactId, corporationRemark)
    const payload = this.mocker.contactPayload(contactId)
    payload.corporation = corporationRemark ?? undefined
    await this.contactPayloadDirty(contactId)
  }

  override async contactDescription (contactId: string, description: string | null) {
    log.verbose('PuppetMock', 'contactDescription(%s, %s)', contactId, description)
    const payload = this.mocker.contactPayload(contactId)
    payload.description = description ?? undefined
    await this.contactPayloadDirty(contactId)
  }

  override async contactList (): Promise<string[]> {
    log.verbose('PuppetMock', 'contactList()')
    return [...this.mocker.cacheContactPayload.keys()]
  }

  /** Returns the stored or default PNG for a contact avatar read. */
  override async contactAvatar (contactId: string)                : Promise<FileBoxInterface>
  /** Stores a contact avatar in the mock and marks the contact dirty. */
  override async contactAvatar (contactId: string, file: FileBoxInterface) : Promise<void>

  override async contactAvatar (contactId: string, file?: FileBoxInterface): Promise<void | FileBoxInterface> {
    log.verbose('PuppetMock', 'contactAvatar(%s)', contactId)

    if (file) {
      const base64 = await file.toBase64()
      this.mocker.cacheContactAvatar.set(contactId, { base64, name: file.name })
      await this.contactPayloadDirty(contactId)
      return
    }

    const stored = this.mocker.cacheContactAvatar.get(contactId)
    if (stored) {
      return FileBox.fromBase64(stored.base64, stored.name)
    }

    return FileBox.fromBase64(WECHATY_ICON_PNG_BASE64, 'wechaty-icon.png')
  }

  override async contactRawPayloadParser (payload: PUPPET.payloads.Contact) { return payload }
  override async contactRawPayload (id: string): Promise<PUPPET.payloads.Contact> {
    log.verbose('PuppetMock', 'contactRawPayload(%s)', id)
    return this.mocker.contactPayload(id)
  }

  /**
   *
   * Conversation
   *
   */
  override async conversationReadMark (conversationId: string, hasRead = true): Promise<void> {
    log.verbose('PuppetMock', 'conversationReadMark(%s, %s)', conversationId, hasRead)
    this.mocker.cacheConversationRead.set(conversationId, hasRead)
  }

  /**
   *
   * Message
   *
   */
  override async messageContact (
    messageId: string,
  ): Promise<string> {
    log.verbose('PuppetMock', 'messageContact(%s)', messageId)
    return this.mocker.cacheMessageContactId.get(messageId) ?? ''
  }

  override async messageImage (
    messageId: string,
    imageType: PUPPET.types.Image,
  ) : Promise<FileBoxInterface> {
    log.verbose('PuppetMock', 'messageImage(%s, %s[%s])',
      messageId,
      imageType,
      PUPPET.helpers.typeName(PUPPET.types.Image, imageType),
    )
    const json = this.mocker.cacheFileBoxPayload.get(messageId)
    if (json) {
      return FileBox.fromJSON(json)
    }
    return FileBox.fromBase64(WECHATY_ICON_PNG_BASE64, `mock-image-${imageType}.png`)
  }

  override async messageRecall (
    messageId: string,
  ): Promise<boolean> {
    log.verbose('PuppetMock', 'messageRecall(%s)', messageId)
    const payload = this.mocker.cacheMessagePayload.get(messageId)
    if (!payload || payload.type === PUPPET.types.Message.Recalled) {
      return false
    }
    payload.type = PUPPET.types.Message.Recalled
    payload.text = messageId
    await this.messagePayloadDirty(messageId)
    this.dispatchEvent(new PUPPET.WechatyEvent('message', {
      detail: { messageId },
    }))
    return true
  }

  override async messageFile (id: string): Promise<FileBoxInterface> {
    const json = this.mocker.cacheFileBoxPayload.get(id)
    if (!json) {
      throw new Error('no filebox cache')
    }
    return FileBox.fromJSON(json)
  }

  override async messageUrl (messageId: string)  : Promise<PUPPET.payloads.UrlLink> {
    log.verbose('PuppetMock', 'messageUrl(%s)', messageId)
    return this.mocker.cacheMessageUrlPayload.get(messageId) ?? {
      title : 'mock title for ' + messageId,
      url   : 'https://mock.url',
    }
  }

  override async messageLocation (messageId: string): Promise<PUPPET.payloads.Location> {
    log.verbose('PuppetMock', 'messageLocation(%s)', messageId)
    return this.mocker.cacheMessageLocationPayload.get(messageId) ?? {
      accuracy  : 15,
      address   : '北京市北京市海淀区45 Chengfu Rd',
      latitude  : 39.995120999999997,
      longitude : 116.334154,
      name      : '东升乡人民政府(海淀区成府路45号)',
    }
  }

  override async messageMiniProgram (messageId: string): Promise<PUPPET.payloads.MiniProgram> {
    log.verbose('PuppetMock', 'messageMiniProgram(%s)', messageId)
    return this.mocker.cacheMessageMiniProgramPayload.get(messageId) ?? {
      title : 'mock title for ' + messageId,
    }
  }

  override async messageRawPayloadParser (payload: PUPPET.payloads.Message) { return payload }
  override async messageRawPayload (id: string): Promise<PUPPET.payloads.Message> {
    log.verbose('PuppetMock', 'messageRawPayload(%s)', id)
    return this.mocker.messagePayload(id)
  }

  protected async _messageSend (
    conversationId: string,
    something: string | FileBoxInterface,
    mentionIdList: string[] = [],
  ): Promise<string> {
    log.verbose('PuppetMock', 'messageSend(%s, %s)', conversationId, something)
    if (!this.isLoggedIn) {
      throw new Error('not logged in')
    }

    const user = this.mocker.ContactMock.load(this.currentUserId)
    const mentions = mentionIdList.map((id) => this.mocker.ContactMock.load(id))
    const conversation = /@/.test(conversationId)
      ? this.mocker.RoomMock.load(conversationId)
      : this.mocker.ContactMock.load(conversationId)

    return user.say(something, mentions).to(conversation)
  }

  /**
   * Creates and emits a typed message (contact card, URL, location, mini-program, or post),
   * running `onBeforeEmit` before the `message` event is dispatched so attachment caches
   * are populated when listeners inspect the message.
   */
  private _createTypedMessage (
    conversationId: string,
    type: PUPPET.types.Message,
    text?: string,
    onBeforeEmit?: (id: string) => void,
  ): string {
    if (!this.isLoggedIn) {
      throw new Error('not logged in')
    }
    const target = /@/.test(conversationId)
      ? { roomId: this.mocker.RoomMock.load(conversationId).id }
      : { listenerId: this.mocker.ContactMock.load(conversationId).id }

    return this.mocker.createAndEmitMessage({
      talkerId: this.currentUserId,
      text,
      type,
      ...target,
    }, onBeforeEmit)
  }

  /**
   * Materializes a `SayablePayload` into a persisted `MessagePayload` (and attachment
   * cache entry) so `Post` sayable IDs resolve via `messagePayload(id)`.
   */
  private _materializeSayable (
    sayable: PUPPET.payloads.Sayable | string,
    talkerId: string,
  ): string {
    if (typeof sayable === 'string') {
      return sayable
    }
    const id = crypto.randomUUID()
    const base: PUPPET.payloads.MessageBase = {
      id,
      talkerId,
      timestamp: Date.now(),
      type: PUPPET.types.Message.Text,
    }
    switch (sayable.type) {
      case PUPPET.types.Sayable.Text:
        base.type = PUPPET.types.Message.Text
        base.text = sayable.payload.text
        break
      case PUPPET.types.Sayable.Url:
        base.type = PUPPET.types.Message.Url
        base.text = sayable.payload.title
        this.mocker.cacheMessageUrlPayload.set(id, sayable.payload)
        break
      case PUPPET.types.Sayable.Location:
        base.type = PUPPET.types.Message.Location
        base.text = sayable.payload.name
        this.mocker.cacheMessageLocationPayload.set(id, sayable.payload)
        break
      case PUPPET.types.Sayable.MiniProgram:
        base.type = PUPPET.types.Message.MiniProgram
        base.text = sayable.payload.title
        this.mocker.cacheMessageMiniProgramPayload.set(id, sayable.payload)
        break
      case PUPPET.types.Sayable.Contact:
        base.type = PUPPET.types.Message.Contact
        this.mocker.cacheMessageContactId.set(id, sayable.payload.contactId)
        break
      case PUPPET.types.Sayable.Attachment:
      case PUPPET.types.Sayable.Image:
      case PUPPET.types.Sayable.Audio:
      case PUPPET.types.Sayable.Video:
        base.type = PUPPET.types.Message.Attachment
        break
      default:
        break
    }
    this.mocker.MessageMock.create(base as PUPPET.payloads.Message)
    return id
  }

  /**
   * Stores a `PostPayload` as a `PostServer` in `mocker.cachePostPayload` under `id`,
   * materializing any client sayables into message records.
   */
  private _storePostPayload (
    id: string,
    payload: PUPPET.payloads.Post,
  ): PUPPET.payloads.PostServer {
    const contactId = ('contactId' in payload && payload.contactId)
      ? payload.contactId
      : (this.isLoggedIn ? this.currentUserId : '')
    const sayableIdList = payload.sayableList.map((item) =>
      this._materializeSayable(item, contactId),
    )
    const stored: PUPPET.payloads.PostServer = {
      ...payload,
      contactId,
      counter: ('counter' in payload && payload.counter)
        ? payload.counter
        : { children: 0, descendant: 0, taps: {} },
      id,
      sayableList: sayableIdList,
      timestamp: ('timestamp' in payload && payload.timestamp) ? payload.timestamp : Date.now(),
    }
    this.mocker.cachePostPayload.set(id, stored)
    return stored
  }

  override async messageSendText (
    conversationId: string,
    text: string,
    mentionIdList?: string[],
  ): Promise<void | string> {
    return this._messageSend(conversationId, text, mentionIdList)
  }

  override async messageSendFile (
    conversationId: string,
    file: FileBoxInterface,
  ): Promise<void | string> {
    return this._messageSend(conversationId, file)
  }

  override async messageSendContact (
    conversationId: string,
    contactId: string,
  ): Promise<void | string> {
    log.verbose('PuppetMock', 'messageSendContact(%s, %s)', conversationId, contactId)
    this.mocker.contactPayload(contactId)
    return this._createTypedMessage(conversationId, PUPPET.types.Message.Contact, undefined, (id) => {
      this.mocker.cacheMessageContactId.set(id, contactId)
    })
  }

  override async messageSendUrl (
    conversationId: string,
    urlLinkPayload: PUPPET.payloads.UrlLink,
  ): Promise<void | string> {
    log.verbose('PuppetMock', 'messageSendUrl(%s, %s)', conversationId, JSON.stringify(urlLinkPayload))
    return this._createTypedMessage(conversationId, PUPPET.types.Message.Url, urlLinkPayload.title, (id) => {
      this.mocker.cacheMessageUrlPayload.set(id, urlLinkPayload)
    })
  }

  override async messageSendLocation (
    conversationId: string,
    locationPayload: PUPPET.payloads.Location,
  ): Promise<void | string> {
    log.verbose('PuppetMock', 'messageSendLocation(%s, %s)', conversationId, JSON.stringify(locationPayload))
    return this._createTypedMessage(conversationId, PUPPET.types.Message.Location, locationPayload.name, (id) => {
      this.mocker.cacheMessageLocationPayload.set(id, locationPayload)
    })
  }

  override async messageSendMiniProgram (
    conversationId: string,
    miniProgramPayload: PUPPET.payloads.MiniProgram,
  ): Promise<void | string> {
    log.verbose('PuppetMock', 'messageSendMiniProgram(%s, %s)', conversationId, JSON.stringify(miniProgramPayload))
    return this._createTypedMessage(conversationId, PUPPET.types.Message.MiniProgram, miniProgramPayload.title, (id) => {
      this.mocker.cacheMessageMiniProgramPayload.set(id, miniProgramPayload)
    })
  }

  override async messageSendPost (
    conversationId: string,
    postPayload: PUPPET.payloads.Post,
  ): Promise<void | string> {
    log.verbose('PuppetMock', 'messageSendPost(%s, %s)', conversationId, JSON.stringify(postPayload))
    return this._createTypedMessage(conversationId, PUPPET.types.Message.Post, undefined, (id) => {
      this.mocker.cacheMessagePostPayload.set(id, postPayload)
      this._storePostPayload(id, postPayload)
    })
  }

  override async messageForward (
    conversationId: string,
    messageId: string,
  ): Promise<void | string> {
    log.verbose('PuppetMock', 'messageForward(%s, %s)', conversationId, messageId)
    const original = this.mocker.messagePayload(messageId)
    switch (original.type) {
      case PUPPET.types.Message.Text:
        return this.messageSendText(conversationId, original.text ?? '')
      case PUPPET.types.Message.Contact: {
        const contactId = this.mocker.cacheMessageContactId.get(messageId)
        if (contactId) return this.messageSendContact(conversationId, contactId)
        break
      }
      case PUPPET.types.Message.Url: {
        const urlPayload = this.mocker.cacheMessageUrlPayload.get(messageId)
        if (urlPayload) return this.messageSendUrl(conversationId, urlPayload)
        break
      }
      case PUPPET.types.Message.Location: {
        const locPayload = this.mocker.cacheMessageLocationPayload.get(messageId)
        if (locPayload) return this.messageSendLocation(conversationId, locPayload)
        break
      }
      case PUPPET.types.Message.MiniProgram: {
        const mpPayload = this.mocker.cacheMessageMiniProgramPayload.get(messageId)
        if (mpPayload) return this.messageSendMiniProgram(conversationId, mpPayload)
        break
      }
      case PUPPET.types.Message.Post: {
        const postPayload = this.mocker.cacheMessagePostPayload.get(messageId) ?? this.mocker.cachePostPayload.get(messageId)
        if (postPayload) return this.messageSendPost(conversationId, postPayload)
        break
      }
      default:
        break
    }
    const fileJson = this.mocker.cacheFileBoxPayload.get(messageId)
    if (fileJson) {
      return this.messageSendFile(conversationId, FileBox.fromJSON(fileJson))
    }
    return this._createTypedMessage(conversationId, original.type, original.text)
  }

  /**
   *
   * Room
   *
   */
  override async roomRawPayloadParser (payload: PUPPET.payloads.Room) { return payload }
  override async roomRawPayload (id: string): Promise<PUPPET.payloads.Room> {
    log.verbose('PuppetMock', 'roomRawPayload(%s)', id)
    return this.mocker.roomPayload(id)
  }

  override async roomList (): Promise<string[]> {
    log.verbose('PuppetMock', 'roomList()')
    return [...this.mocker.cacheRoomPayload.keys()]
  }

  override async roomDel (
    roomId    : string,
    contactId : string | string[],
  ): Promise<void> {
    log.verbose('PuppetMock', 'roomDel(%s, %s)', roomId, contactId)
    const ids = Array.isArray(contactId) ? contactId : [contactId]
    const payload = this.mocker.roomPayload(roomId)
    const existing = new Set(payload.memberIdList)
    const removed = ids.filter((id) => existing.has(id))
    if (removed.length === 0) {
      return
    }
    const removedSet = new Set(removed)
    payload.memberIdList = payload.memberIdList.filter((id) => !removedSet.has(id))
    for (const id of removed) {
      this.mocker.cacheRoomMemberPayload.delete(`${roomId}:${id}`)
    }
    await this.roomPayloadDirty(roomId)
    const removerId = this.isLoggedIn ? this.currentUserId : (payload.ownerId ?? removed[0])
    if (removerId) {
      this.dispatchEvent(new PUPPET.WechatyEvent('room-leave', {
        detail: {
          removeeIdList: removed,
          removerId,
          roomId,
          timestamp: Date.now(),
        },
      }))
    }
  }

  override async roomAvatar (roomId: string): Promise<FileBoxInterface> {
    log.verbose('PuppetMock', 'roomAvatar(%s)', roomId)

    const payload = await this.roomPayload(roomId)

    if (payload.avatar) {
      return FileBox.fromUrl(payload.avatar)
    }
    return qrCodeForChatie()
  }

  override async roomAdd (
    roomId     : string,
    contactId  : string | string[],
    inviteOnly?: boolean,
  ): Promise<void> {
    log.verbose('PuppetMock', 'roomAdd(%s, %s, %s)', roomId, contactId, inviteOnly)
    const ids = Array.isArray(contactId) ? contactId : [contactId]
    const payload = this.mocker.roomPayload(roomId)

    if (inviteOnly) {
      const room = this.mocker.RoomMock.load(roomId)
      const inviterId = this.isLoggedIn ? this.currentUserId : (payload.ownerId ?? ids[0] ?? '')
      const inviter = this.mocker.ContactMock.load(inviterId)
      for (const receiverId of ids) {
        this.mocker.receiveRoomInvitation(room, inviter, receiverId)
      }
      return
    }

    const existing = new Set(payload.memberIdList)
    const added: string[] = []
    for (const id of ids) {
      if (!existing.has(id)) {
        existing.add(id)
        added.push(id)
      }
    }
    payload.memberIdList = [...existing]
    await this.roomPayloadDirty(roomId)
    const inviterId = this.isLoggedIn ? this.currentUserId : (payload.ownerId ?? added[0])
    if (added.length > 0 && inviterId) {
      this.dispatchEvent(new PUPPET.WechatyEvent('room-join', {
        detail: {
          inviteeIdList: added,
          inviterId,
          roomId,
          timestamp: Date.now(),
        },
      }))
    }
  }

  override async roomTopic (roomId: string)                : Promise<string>
  override async roomTopic (roomId: string, topic: string) : Promise<void>

  override async roomTopic (
    roomId: string,
    topic?: string,
  ): Promise<void | string> {
    log.verbose('PuppetMock', 'roomTopic(%s, %s)', roomId, topic)
    const payload = this.mocker.roomPayload(roomId)

    if (typeof topic === 'undefined') {
      return payload.topic
    }

    const oldTopic = payload.topic
    payload.topic = topic
    await this.roomPayloadDirty(roomId)
    const changerId = this.isLoggedIn ? this.currentUserId : (payload.ownerId ?? payload.memberIdList[0])
    if (changerId) {
      this.dispatchEvent(new PUPPET.WechatyEvent('room-topic', {
        detail: {
          changerId,
          newTopic: topic,
          oldTopic,
          roomId,
          timestamp: Date.now(),
        },
      }))
    }
  }

  override async roomCreate (
    contactIdList : string[],
    topic         : string = '',
  ): Promise<string> {
    log.verbose('PuppetMock', 'roomCreate(%s, %s)', contactIdList, topic)
    const memberSet = new Set(contactIdList)
    const ownerId = this.isLoggedIn ? this.currentUserId : contactIdList[0]
    if (this.isLoggedIn) {
      memberSet.add(this.currentUserId)
    }
    const room = this.mocker.createRoom({
      adminIdList: ownerId ? [ownerId] : [],
      memberIdList: [...memberSet],
      ownerId,
      topic,
    })
    return room.id
  }

  override async roomQuit (roomId: string): Promise<void> {
    log.verbose('PuppetMock', 'roomQuit(%s)', roomId)
    if (this.isLoggedIn) {
      await this.roomDel(roomId, this.currentUserId)
    }
  }

  override async roomQRCode (roomId: string): Promise<string> {
    log.verbose('PuppetMock', 'roomQRCode(%s)', roomId)
    this.mocker.roomPayload(roomId)
    return roomId + ' mock qrcode'
  }

  override async roomMemberList (roomId: string) : Promise<string[]> {
    log.verbose('PuppetMock', 'roomMemberList(%s)', roomId)
    return this.mocker.roomPayload(roomId).memberIdList
  }

  override async roomMemberRawPayload (roomId: string, contactId: string): Promise<PUPPET.payloads.RoomMember>  {
    log.verbose('PuppetMock', 'roomMemberRawPayload(%s, %s)', roomId, contactId)
    const roomPayload = this.mocker.roomPayload(roomId)
    if (!roomPayload.memberIdList.includes(contactId)) {
      throw new Error(`contact ${contactId} is not a member of room ${roomId}`)
    }
    const stored = this.mocker.cacheRoomMemberPayload.get(`${roomId}:${contactId}`)
    if (stored) {
      return stored
    }

    const contactPayload = await this.contactPayload(contactId)
    return {
      avatar    : contactPayload.avatar,
      id        : contactId,
      name      : contactPayload.name,
    }
  }

  override async roomMemberRawPayloadParser (rawPayload: PUPPET.payloads.RoomMember): Promise<PUPPET.payloads.RoomMember>  {
    log.verbose('PuppetMock', 'roomMemberRawPayloadParser(%s)', rawPayload)
    return rawPayload
  }

  override async roomAnnounce (roomId: string)                : Promise<string>
  override async roomAnnounce (roomId: string, text: string)  : Promise<void>

  override async roomAnnounce (roomId: string, text?: string) : Promise<void | string> {
    const roomPayload = this.mocker.roomPayload(roomId)
    if (typeof text !== 'undefined') {
      const oldAnnounce = this.mocker.cacheRoomAnnounce.get(roomId)
      this.mocker.cacheRoomAnnounce.set(roomId, text)
      await this.roomPayloadDirty(roomId)
      const changerId = this.isLoggedIn ? this.currentUserId : (roomPayload.ownerId ?? roomPayload.memberIdList[0])
      if (changerId) {
        this.dispatchEvent(new PUPPET.WechatyEvent('room-announce', {
          detail: {
            changerId,
            newAnnounce: text,
            oldAnnounce,
            roomId,
            timestamp: Date.now(),
          },
        }))
      }
      return
    }
    return this.mocker.cacheRoomAnnounce.get(roomId) ?? ''
  }

  /**
   *
   * Room Invitation
   *
   */
  override async roomInvitationAccept (roomInvitationId: string): Promise<void> {
    log.verbose('PuppetMock', 'roomInvitationAccept(%s)', roomInvitationId)
    const invitation = this.mocker.cacheRoomInvitationPayload.get(roomInvitationId)
    const roomId = this.mocker.cacheRoomInvitationRoomId.get(roomInvitationId)
    if (!invitation || !roomId) {
      throw new Error(`no roomInvitation found for id ${roomInvitationId}`)
    }
    const memberId = invitation.receiverId || (this.isLoggedIn ? this.currentUserId : '')
    if (memberId) {
      await this.roomAdd(roomId, memberId)
    }
  }

  override async roomInvitationRawPayload (roomInvitationId: string): Promise<PUPPET.payloads.RoomInvitation> {
    log.verbose('PuppetMock', 'roomInvitationRawPayload(%s)', roomInvitationId)
    const payload = this.mocker.cacheRoomInvitationPayload.get(roomInvitationId)
    if (!payload) {
      throw new Error(`no roomInvitation found for id ${roomInvitationId}`)
    }
    return payload
  }

  override async roomInvitationRawPayloadParser (rawPayload: PUPPET.payloads.RoomInvitation): Promise<PUPPET.payloads.RoomInvitation> {
    log.verbose('PuppetMock', 'roomInvitationRawPayloadParser(%s)', JSON.stringify(rawPayload))
    return rawPayload
  }

  /**
   *
   * Friendship
   *
   */
  override async friendshipRawPayload (id: string): Promise<PUPPET.payloads.Friendship> {
    const payload = this.mocker.cacheFriendshipPayload.get(id)
    if (!payload) {
      throw new Error(`no friendship found for id ${id}`)
    }
    return payload
  }

  override async friendshipRawPayloadParser (rawPayload: PUPPET.payloads.Friendship): Promise<PUPPET.payloads.Friendship> {
    return rawPayload
  }

  override async friendshipSearchPhone (
    phone: string,
  ): Promise<null | string> {
    log.verbose('PuppetMock', 'friendshipSearchPhone(%s)', phone)
    for (const [id, payload] of this.mocker.cacheContactPayload) {
      if (payload.phone?.includes(phone)) {
        return id
      }
    }
    return null
  }

  override async friendshipSearchHandle (
    handle: string,
  ): Promise<null | string> {
    log.verbose('PuppetMock', 'friendshipSearchHandle(%s)', handle)
    for (const [id, payload] of this.mocker.cacheContactPayload) {
      if (payload.handle === handle || payload.id === handle) {
        return id
      }
    }
    return null
  }

  override async friendshipAdd (
    contactId : string,
    option?   : PUPPET.types.FriendshipAddOptions,
  ): Promise<void> {
    const hello = typeof option === 'string' ? option : (option?.hello ?? '')
    log.verbose('PuppetMock', 'friendshipAdd(%s, %s)', contactId, hello)
    const contact = this.mocker.ContactMock.load(contactId)
    this.mocker.receiveFriendship(contact, hello, PUPPET.types.Friendship.Verify)
  }

  override async friendshipAccept (
    friendshipId : string,
  ): Promise<void> {
    log.verbose('PuppetMock', 'friendshipAccept(%s)', friendshipId)
    const existing = await this.friendshipRawPayload(friendshipId)
    const contactPayload = this.mocker.contactPayload(existing.contactId)
    contactPayload.friend = true
    await this.dirtyPayload(PUPPET.types.Payload.Contact, existing.contactId)
    const contact = this.mocker.ContactMock.load(existing.contactId)
    this.mocker.receiveFriendship(contact, existing.hello ?? '', PUPPET.types.Friendship.Confirm)
  }

  /**
   *
   * Tag
   *
   */
  override async tagContactAdd (
    tagId: string,
    contactId: string,
  ): Promise<void> {
    log.verbose('PuppetMock', 'tagContactAdd(%s, %s)', tagId, contactId)
    let set = this.mocker.cacheTagContacts.get(tagId)
    if (!set) {
      set = new Set()
      this.mocker.cacheTagContacts.set(tagId, set)
    }
    set.add(contactId)
    await this.dirtyPayload(PUPPET.types.Payload.Contact, contactId)
  }

  override async tagContactRemove (
    tagId: string,
    contactId: string,
  ): Promise<void> {
    log.verbose('PuppetMock', 'tagContactRemove(%s, %s)', tagId, contactId)
    this.mocker.cacheTagContacts.get(tagId)?.delete(contactId)
    await this.dirtyPayload(PUPPET.types.Payload.Contact, contactId)
  }

  override async tagContactDelete (
    tagId: string,
  ): Promise<void> {
    log.verbose('PuppetMock', 'tagContactDelete(%s)', tagId)
    const contacts = this.mocker.cacheTagContacts.get(tagId)
    this.mocker.cacheTagContacts.delete(tagId)
    if (contacts) {
      for (const contactId of contacts) {
        await this.dirtyPayload(PUPPET.types.Payload.Contact, contactId)
      }
    }
  }

  override async tagContactList (
    contactId?: string,
  ): Promise<string[]> {
    log.verbose('PuppetMock', 'tagContactList(%s)', contactId)
    if (!contactId) {
      return [...this.mocker.cacheTagContacts.keys()]
    }
    const tags: string[] = []
    for (const [tagId, contacts] of this.mocker.cacheTagContacts) {
      if (contacts.has(contactId)) {
        tags.push(tagId)
      }
    }
    return tags
  }

  /**
   *
   * Post
   *
   */
  override async postRawPayload (postId: string): Promise<PUPPET.payloads.PostServer> {
    log.verbose('PuppetMock', 'postRawPayload(%s)', postId)
    const payload = this.mocker.cachePostPayload.get(postId)
    if (!payload) {
      throw new Error(`no post found for id ${postId}`)
    }
    return payload
  }

  override async postRawPayloadParser (rawPayload: PUPPET.payloads.PostServer): Promise<PUPPET.payloads.Post> {
    log.verbose('PuppetMock', 'postRawPayloadParser(%s)', rawPayload.id)
    return rawPayload
  }

  override async postPublish (payload: PUPPET.payloads.Post): Promise<string> {
    log.verbose('PuppetMock', 'postPublish({type: %s})',
      PUPPET.helpers.typeName(PUPPET.types.Post, payload.type || PUPPET.types.Post.Unspecified),
    )
    const id = ('id' in payload && payload.id) ? payload.id : crypto.randomUUID()
    this._storePostPayload(id, payload)
    this.dispatchEvent(new PUPPET.WechatyEvent('post', {
      detail: { postId: id },
    }))
    return id
  }

  override async postSearch (
    filter      : PUPPET.filters.Post,
    pagination? : PUPPET.filters.PaginationRequest,
  ): Promise<PUPPET.filters.PaginationResponse<string[]>> {
    log.verbose('PuppetMock', 'postSearch(%s, %s)',
      JSON.stringify(filter),
      JSON.stringify(pagination),
    )
    const allIds = [...this.mocker.cachePostPayload.values()]
      .filter((p) => {
        if (filter.id && p.id !== filter.id) return false
        if (filter.contactId && p.contactId !== filter.contactId) return false
        if (filter.type !== undefined && p.type !== filter.type) return false
        if ('parentId' in filter && p.parentId !== filter.parentId) return false
        if ('rootId' in filter && p.rootId !== filter.rootId) return false
        return true
      })
      .map((p) => p.id)

    const pageSize = pagination?.pageSize ?? allIds.length
    const offset = pagination?.pageToken ? Number.parseInt(pagination.pageToken, 10) : 0
    const slice = allIds.slice(offset, offset + pageSize)
    const nextOffset = offset + slice.length

    return {
      nextPageToken: nextOffset < allIds.length ? String(nextOffset) : undefined,
      response: slice,
    }
  }

  /**
   *
   * Tap
   *
   */
  override async tap (
    postId : string,
    type   : PUPPET.types.Tap = PUPPET.types.Tap.Like,
    tap?   : boolean,
  ): Promise<void | boolean> {
    log.verbose('PuppetMock', 'tap(%s, %s%s)',
      postId,
      PUPPET.helpers.typeName(PUPPET.types.Tap, type),
      typeof tap === 'undefined' ? '' : `, ${tap}`,
    )
    if (!this.isLoggedIn) {
      throw new Error('not logged in')
    }
    const post = await this.postRawPayload(postId)
    let tapPayload = this.mocker.cacheTapPayload.get(postId)
    if (!tapPayload) {
      tapPayload = {}
      this.mocker.cacheTapPayload.set(postId, tapPayload)
    }
    const contactId = this.currentUserId
    const entry = tapPayload[type] ?? { contactId: [], timestamp: [] }

    if (typeof tap === 'undefined') {
      return entry.contactId.includes(contactId)
    }

    const idx = entry.contactId.indexOf(contactId)
    if (tap) {
      if (idx === -1) {
        entry.contactId.push(contactId)
        entry.timestamp.push(Date.now())
      }
      tapPayload[type] = entry
    } else if (idx !== -1) {
      entry.contactId.splice(idx, 1)
      entry.timestamp.splice(idx, 1)
      tapPayload[type] = entry
    }
    post.counter.taps ??= {}
    post.counter.taps[type] = entry.contactId.length
    return tap
  }

  override async tapSearch (
    postId      : string,
    query?      : PUPPET.filters.Tap,
    pagination? : PUPPET.filters.PaginationRequest,
  ): Promise<PUPPET.filters.PaginationResponse<PUPPET.payloads.Tap>> {
    log.verbose('PuppetMock', 'tapSearch(%s%s%s)',
      postId,
      typeof query === 'undefined' ? '' : `, ${JSON.stringify(query)}`,
      typeof pagination === 'undefined' ? '' : `, ${JSON.stringify(pagination)}`,
    )
    const tapPayload = this.mocker.cacheTapPayload.get(postId) ?? {}
    const filtered: PUPPET.payloads.Tap = {}
    const pageSize = pagination?.pageSize
    const offset = pagination?.pageToken ? Number.parseInt(pagination.pageToken, 10) : 0
    let hasMore = false
    let nextToken: string | undefined

    for (const [key, entry] of Object.entries(tapPayload)) {
      const tapType = Number.parseInt(key, 10) as PUPPET.types.Tap
      if (
        query?.type !== undefined
        && query.type !== PUPPET.types.Tap.Unspecified
        && tapType !== query.type
      ) {
        continue
      }
      if (!entry) continue
      const matchedIds: string[] = []
      const matchedTimestamps: number[] = []
      entry.contactId.forEach((cid, i) => {
        if (!query?.contactId || cid === query.contactId) {
          matchedIds.push(cid)
          matchedTimestamps.push(entry.timestamp[i] ?? 0)
        }
      })
      const end = pageSize !== undefined ? offset + pageSize : matchedIds.length
      if (end < matchedIds.length) {
        hasMore = true
        nextToken = String(end)
      }
      const slicedIds = matchedIds.slice(offset, end)
      const slicedTimestamps = matchedTimestamps.slice(offset, end)
      if (slicedIds.length > 0) {
        filtered[tapType] = {
          contactId: slicedIds,
          timestamp: slicedTimestamps,
        }
      }
    }
    return {
      nextPageToken: hasMore ? nextToken : undefined,
      response: filtered,
    }
  }

}

export { PuppetMock }
export default PuppetMock
