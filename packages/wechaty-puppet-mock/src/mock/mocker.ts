/**
 * `Mocker`: the in-memory world behind a `PuppetMock`. It creates contacts,
 * rooms and messages (with fake data from `generator.ts`) and stores their
 * payloads for the puppet to serve. `scan()` and `login()` drive the
 * attached puppet's scan and login; a stored message is emitted as a
 * `message` event on its room, talker and listener mocks.
 */
import * as PUPPET  from 'wechaty-puppet'

import type { PuppetMock } from '../puppet-mock.ts'
import { log } from '../config.ts'

import {
  ContactMock,
  RoomMock,
  MessageMock,

  mockerifyContactMock,
  mockerifyMessageMock,
  mockerifyRoomMock,
}                         from './user/mod.ts'

import {
  generateContactPayload,
  generateRoomPayload,
}                           from './generator.ts'
import type { EnvironmentMock } from './environment.ts'
import type { FileBox } from 'file-box'

/** file-box's JSON form of a FileBox; file-box does not export the type itself. */
type FileBoxJsonObject = ReturnType<FileBox['toJSON']>

class Mocker {

  id: string

  cacheContactPayload            : Map<string, PUPPET.payloads.Contact>
  cacheContactAvatar             : Map<string, { base64: string, name: string }>
  cacheRoomPayload               : Map<string, PUPPET.payloads.Room>
  cacheRoomAnnounce              : Map<string, string>
  cacheRoomMemberPayload         : Map<string, PUPPET.payloads.RoomMember>
  cacheRoomInvitationPayload     : Map<string, PUPPET.payloads.RoomInvitation>
  cacheRoomInvitationRoomId      : Map<string, string>
  cacheMessagePayload            : Map<string, PUPPET.payloads.Message>
  cacheMessageContactId          : Map<string, string>
  cacheMessageUrlPayload         : Map<string, PUPPET.payloads.UrlLink>
  cacheMessageLocationPayload    : Map<string, PUPPET.payloads.Location>
  cacheMessageMiniProgramPayload : Map<string, PUPPET.payloads.MiniProgram>
  cacheMessagePostPayload        : Map<string, PUPPET.payloads.Post>
  cacheFileBoxPayload            : Map<string, FileBoxJsonObject>
  cacheFriendshipPayload         : Map<string, PUPPET.payloads.Friendship>
  cacheTagContacts               : Map<string, Set<string>>
  cachePostPayload               : Map<string, PUPPET.payloads.PostServer>
  cacheTapPayload                : Map<string, PUPPET.payloads.Tap>
  cacheConversationRead          : Map<string, boolean>

  protected mockerifiedContactMock? : typeof ContactMock
  protected mockerifiedMessageMock? : typeof MessageMock
  protected mockerifiedRoomMock?    : typeof RoomMock

  get ContactMock () : typeof ContactMock { return this.mockerifiedContactMock! }
  get MessageMock () : typeof MessageMock { return this.mockerifiedMessageMock! }
  get RoomMock    () : typeof RoomMock    { return this.mockerifiedRoomMock!    }

  protected environmentList          : EnvironmentMock[]
  protected cleanupFns : (() => void)[]

  protected _puppet?: PuppetMock

  set puppet (puppet: PuppetMock) {
    if (this._puppet) {
      throw new Error('puppet has already been set before. can not be set twice.')
    }
    this._puppet = puppet
  }

  get puppet () {
    if (!this._puppet) {
      throw new Error('puppet has not been set yet, cannot be used.')
    }
    return this._puppet
  }

  constructor () {
    log.verbose('Mocker', 'constructor()')

    this.id = crypto.randomUUID()

    this.environmentList          = []
    this.cleanupFns = []

    this.cacheContactPayload            = new Map()
    this.cacheContactAvatar             = new Map()
    this.cacheMessagePayload            = new Map()
    this.cacheMessageContactId          = new Map()
    this.cacheMessageUrlPayload         = new Map()
    this.cacheMessageLocationPayload    = new Map()
    this.cacheMessageMiniProgramPayload = new Map()
    this.cacheMessagePostPayload        = new Map()
    this.cacheRoomPayload               = new Map()
    this.cacheRoomAnnounce              = new Map()
    this.cacheRoomMemberPayload         = new Map()
    this.cacheRoomInvitationPayload     = new Map()
    this.cacheRoomInvitationRoomId      = new Map()
    this.cacheFileBoxPayload            = new Map()
    this.cacheFriendshipPayload         = new Map()
    this.cacheTagContacts               = new Map()
    this.cachePostPayload               = new Map()
    this.cacheTapPayload                = new Map()
    this.cacheConversationRead          = new Map()

    this.mockerifiedContactMock = mockerifyContactMock(this)
    this.mockerifiedMessageMock = mockerifyMessageMock(this)
    this.mockerifiedRoomMock    = mockerifyRoomMock(this)
  }

  toString () {
    return `Mocker<${this.id}>`
  }

  use (...behaviorList: EnvironmentMock[]): void {
    log.verbose('Mocker', 'use(%s)', behaviorList.length)

    this.environmentList.push(
      ...behaviorList,
    )
  }

  start () {
    log.verbose('Mocker', 'start()')

    this.environmentList.forEach(behavior => {
      log.verbose('Mocker', 'start() enabling behavior %s', behavior.name)
      const stop = behavior(this)
      this.cleanupFns.push(stop)
    })
  }

  stop () {
    log.verbose('Mocker', 'stop()')

    this.cleanupFns.forEach(fn => setTimeout(fn, 0))
    this.cleanupFns.length = 0
  }

  randomContact (): undefined | ContactMock {
    log.verbose('Mocker', 'randomContact()')

    const contactIdList = [...this.cacheContactPayload.keys()]

    if (contactIdList.length <= 0) {
      return
    }

    const index = Math.floor(contactIdList.length * Math.random())
    const id = contactIdList[index]!

    const payload = this.cacheContactPayload.get(id)
    if (!payload) {
      throw new Error('no payload')
    }
    return this.ContactMock.load(id)
  }

  randomRoom (): undefined | RoomMock {
    log.verbose('Mocker', 'randomRoom()')

    const roomIdList = [...this.cacheRoomPayload.keys()]

    if (roomIdList.length <= 0) {
      return
    }

    const index = Math.floor(roomIdList.length * Math.random())
    const id = roomIdList[index]!

    const payload = this.cacheRoomPayload.get(id)
    if (!payload) {
      throw new Error('no payload')
    }
    return this.RoomMock.load(id)
  }

  randomConversation (): ContactMock | RoomMock {
    log.verbose('Mocker', 'randomConversation()')

    const contactIdList = [...this.cacheContactPayload.keys()]
    const roomIdList    = [...this.cacheRoomPayload.keys()]

    const total = contactIdList.length + roomIdList.length
    if (total <= 0) {
      throw new Error('no conversation found: 0 contact & 0 room!')
    }

    const pickContact = contactIdList.length / total

    let conversation: undefined | ContactMock | RoomMock

    if (Math.random() < pickContact) {
      conversation = this.randomContact()
    } else {  // const pickRoom = roomIdList.length / total
      conversation = this.randomRoom()
    }

    if (!conversation) {
      throw new Error('no conversation')
    }
    return conversation
  }

  /**
   *
   * Events
   *
   */
  scan (qrcode: string, status: PUPPET.types.ScanStatus = PUPPET.types.ScanStatus.Waiting) {
    log.verbose('Mocker', 'scan(%s, %s)', qrcode, status)
    this.puppet.dispatchEvent(new PUPPET.WechatyEvent('scan', {
      detail: { qrcode, status },
    }))
  }

  login (user: ContactMock) {
    log.verbose('Mocker', 'login(%s)', user)
    this.puppet.login(user.id)
  }

  /**
   *
   * Creators for MockContacts / MockRooms
   *
   */

  /**
   * create an contact by specifying the payload
   */
  createContact (payload?: Partial<PUPPET.payloads.Contact>): ContactMock {
    log.verbose('Mocker', 'createContact(%s)', payload ? JSON.stringify(payload) : '')

    const defaultPayload = generateContactPayload()
    const normalizedPayload: PUPPET.payloads.Contact = {
      ...defaultPayload,
      ...payload,
    }
    return this.ContactMock.create(normalizedPayload)
  }

  /**
   * create `num` contacts randomly
   */
  createContacts (num: number): ContactMock[] {
    log.verbose('Mocker', 'createContacts(%s)', num)

    const contactList = [] as ContactMock[]

    while (num--) {
      const contact = this.createContact()
      contactList.push(contact)
    }

    return contactList
  }

  /**
   * create a room by specifying the payload
   */
  createRoom (payload?: Partial<PUPPET.payloads.Room>): RoomMock {
    log.verbose('Mocker', 'createRoom(%s)', payload ? JSON.stringify(payload) : '')

    const defaultPayload = generateRoomPayload(...this.cacheContactPayload.keys())

    const normalizedPayload: PUPPET.payloads.Room = {
      ...defaultPayload,
      ...payload,
    }

    return this.RoomMock.create(normalizedPayload)
  }

  /**
   * create `num` rooms randomly
   */
  createRooms (num: number): RoomMock[] {
    log.verbose('Mocker', 'createRooms(%s)', num)
    const roomList = [] as RoomMock[]

    while (num--) {
      const room = this.createRoom()
      roomList.push(room)
    }

    return roomList
  }

  /**
   *
   * Setters & Getters for Payloads
   *
   */
  contactPayload (id: string, payload: PUPPET.payloads.Contact): void
  contactPayload (id: string): PUPPET.payloads.Contact

  contactPayload (id: string, payload?: PUPPET.payloads.Contact): void | PUPPET.payloads.Contact {
    log.silly('Mocker', 'contactPayload(%s%s)', id, payload ? ',' + JSON.stringify(payload) : '')

    if (payload) {
      this.cacheContactPayload.set(id, payload)
      return
    }

    payload = this.cacheContactPayload.get(id)
    if (!payload) {
      throw new Error('no payload found for id ' + id)
    }
    return payload
  }

  roomPayload (id: string, payload: PUPPET.payloads.Room): void
  roomPayload (id: string): PUPPET.payloads.Room

  roomPayload (id: string, payload?: PUPPET.payloads.Room): void | PUPPET.payloads.Room {
    log.silly('Mocker', 'roomPayload(%s%s)', id, payload ? ',' + JSON.stringify(payload) : '')

    if (payload) {
      this.cacheRoomPayload.set(id, payload)
      return
    }

    payload = this.cacheRoomPayload.get(id)
    if (!payload) {
      throw new Error('no payload found for id ' + id)
    }
    return payload
  }

  messagePayload (id: string, payload: PUPPET.payloads.Message): void
  messagePayload (id: string): PUPPET.payloads.Message

  messagePayload (id: string, payload?: PUPPET.payloads.Message): void | PUPPET.payloads.Message {
    log.silly('Mocker', 'messagePayload(%s%s)', id, payload ? ',' + JSON.stringify(payload) : '')

    if (payload) {
      this.cacheMessagePayload.set(id, payload)

      const msg = this.MessageMock.load(payload.id)

      msg.room()?.dispatchEvent(new PUPPET.WechatyEvent('message', { detail: msg }))
      msg.talker().dispatchEvent(new PUPPET.WechatyEvent('message', { detail: msg }))
      msg.listener()?.dispatchEvent(new PUPPET.WechatyEvent('message', { detail: msg }))

      return
    }

    payload = this.cacheMessagePayload.get(id)
    if (!payload) {
      throw new Error('no payload found for id ' + id)
    }
    return payload
  }

  /**
   * Create a message payload targeting a contact or room, store it, invoke
   * `onBeforeEmit` before dispatching so attachment caches are populated,
   * and emit a `message` event on the attached puppet.
   */
  createAndEmitMessage (
    partial: Omit<PUPPET.payloads.MessageBase, 'id' | 'timestamp'> & (
      { listenerId: string } | { roomId: string, mentionIdList?: string[] }
    ),
    onBeforeEmit?: (id: string) => void,
  ): string {
    const id = crypto.randomUUID()
    const payload = {
      ...partial,
      id,
      timestamp: Date.now(),
    } as PUPPET.payloads.Message
    onBeforeEmit?.(id)
    this.MessageMock.create(payload)
    if (this._puppet) {
      this._puppet.dispatchEvent(new PUPPET.WechatyEvent('message', {
        detail: { messageId: id },
      }))
    }
    return id
  }

  /**
   * Simulate receiving or sending a room invitation and emit `room-invite`.
   */
  receiveRoomInvitation (
    room: RoomMock,
    inviter: ContactMock,
    receiverId?: string,
  ): PUPPET.payloads.RoomInvitation {
    const id = crypto.randomUUID()
    const payload: PUPPET.payloads.RoomInvitation = {
      avatar       : room.payload.avatar ?? '',
      id,
      invitation   : `${inviter.payload.name} invited you to join ${room.payload.topic}`,
      inviterId    : inviter.id,
      memberCount  : room.payload.memberIdList.length,
      memberIdList : [...room.payload.memberIdList],
      receiverId   : receiverId ?? (this._puppet?.isLoggedIn ? this._puppet.currentUserId : ''),
      timestamp    : Date.now(),
      topic        : room.payload.topic,
    }
    this.cacheRoomInvitationPayload.set(id, payload)
    this.cacheRoomInvitationRoomId.set(id, room.id)
    if (this._puppet) {
      this._puppet.dispatchEvent(new PUPPET.WechatyEvent('room-invite', {
        detail: { roomInvitationId: id },
      }))
    }
    return payload
  }

  /**
   * Simulate receiving or updating a friendship request and emit `friendship`.
   */
  receiveFriendship (
    contact: ContactMock,
    hello: string,
    type: PUPPET.types.Friendship = PUPPET.types.Friendship.Receive,
  ): PUPPET.payloads.Friendship {
    const id = crypto.randomUUID()
    const payload: PUPPET.payloads.Friendship = {
      contactId : contact.id,
      hello,
      id,
      timestamp : Date.now(),
      type,
    } as PUPPET.payloads.Friendship
    this.cacheFriendshipPayload.set(id, payload)
    if (this._puppet) {
      this._puppet.dispatchEvent(new PUPPET.WechatyEvent('friendship', {
        detail: { friendshipId: id },
      }))
    }
    return payload
  }

}

export { Mocker }
