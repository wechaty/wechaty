import cuid from 'cuid'
import {
  ContactPayload,
  RoomPayload,
  MessagePayload,
  ScanStatus,
  log,
}                     from 'wechaty-puppet'

import { cloneClass } from 'clone-class'

import { PuppetMock } from '../puppet-mock'

import {
  ContactMock,
  RoomMock,
  MessageMock,
}                   from './user/mod'

import {
  generateContactPayload,
  generateRoomPayload,
}                           from './generator'
import { MockEnvironment } from './environment'

class Mocker {

  id: string

  cacheContactPayload : Map<string, ContactPayload>
  cacheRoomPayload    : Map<string, RoomPayload>
  cacheMessagePayload : Map<string, MessagePayload>

  public MockContact : typeof ContactMock
  public MockMessage : typeof MessageMock
  public MockRoom    : typeof RoomMock

  protected behaviorList: MockEnvironment[]
  protected behaviorCleanupFnList: (() => void)[]

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

    this.id = cuid()

    this.behaviorList          = []
    this.behaviorCleanupFnList = []

    this.cacheContactPayload = new Map()
    this.cacheRoomPayload    = new Map()
    this.cacheMessagePayload = new Map()

    this.MockContact = cloneClass(ContactMock)
    this.MockMessage = cloneClass(MessageMock)
    this.MockRoom    = cloneClass(RoomMock)

    this.MockContact.mocker = this
    this.MockMessage.mocker = this
    this.MockRoom.mocker    = this
  }

  toString () {
    return `Mocker<${this.id}>`
  }

  use (...behaviorList: MockEnvironment[]): void {
    log.verbose('Mocker', 'use(%s)', behaviorList.length)

    this.behaviorList.push(
      ...behaviorList,
    )
  }

  start () {
    log.verbose('Mocker', 'start()')

    // /**
    //  * Huan(202006): Workaround for puppet restart problem
    //  */
    // this.MockContact = cloneClass(MockContact)
    // this.MockMessage = cloneClass(MockMessage)
    // this.MockRoom    = cloneClass(MockRoom)

    // this.MockContact.mocker = this
    // this.MockMessage.mocker = this
    // this.MockRoom.mocker    = this

    this.behaviorList.forEach(behavior => {
      log.verbose('Mocker', 'start() enabling behavior %s', behavior.name)
      const stop = behavior(this)
      this.behaviorCleanupFnList.push(stop)
    })
  }

  stop () {
    log.verbose('Mocker', 'stop()')
    let n = 0
    this.behaviorCleanupFnList.forEach(fn => {
      log.verbose('Mocker', 'stop() cleaning behavior #%s', n++)
      fn()
    })
    this.behaviorCleanupFnList.length = 0
  }

  randomContact (): undefined | ContactMock {
    log.verbose('Mocker', 'randomContact()')

    const contactIdList = [...this.cacheContactPayload.keys()]

    if (contactIdList.length <= 0) {
      return
    }

    const index = Math.floor(contactIdList.length * Math.random())
    const id = contactIdList[index]

    const payload = this.cacheContactPayload.get(id)
    if (!payload) {
      throw new Error('no payload')
    }
    return this.MockContact.create(payload)
  }

  randomRoom (): undefined | RoomMock {
    log.verbose('Mocker', 'randomRoom()')

    const roomIdList = [...this.cacheRoomPayload.keys()]

    if (roomIdList.length <= 0) {
      return
    }

    const index = Math.floor(roomIdList.length * Math.random())
    const id = roomIdList[index]

    const payload = this.cacheRoomPayload.get(id)
    if (!payload) {
      throw new Error('no payload')
    }
    return this.MockRoom.create(payload)
  }

  public randomConversation (): ContactMock | RoomMock {
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
  scan (qrcode: string, status: ScanStatus = ScanStatus.Waiting) {
    this.puppet.emit('scan', { qrcode, status })
  }

  login (user: ContactMock) {
    this.puppet.login(user.id)
      .catch(e => log.error('Mocker', 'login(%s) rejection: %s', user.id, e))
  }

  /**
   *
   * Creators for MockContacts / MockRooms
   *
   */
  createContact (payload?: Partial<ContactPayload>): ContactMock {
    log.verbose('Mocker', 'createContact(%s)', payload ? JSON.stringify(payload) : '')

    const defaultPayload = generateContactPayload()
    const normalizedPayload: ContactPayload = {
      ...defaultPayload,
      ...payload,
    }
    return this.MockContact.create(normalizedPayload)
  }

  createContacts (num: number): ContactMock[] {
    log.verbose('Mocker', 'createContacts(%s)', num)

    const contactList = [] as ContactMock[]

    while (num--) {
      const contact = this.createContact()
      contactList.push(contact)
    }

    return contactList
  }

  createRoom (payload?: Partial<RoomPayload>): RoomMock {
    log.verbose('Mocker', 'createRoom(%s)', payload ? JSON.stringify(payload) : '')

    const defaultPayload = generateRoomPayload(...this.cacheContactPayload.keys())

    const normalizedPayload: RoomPayload = {
      ...defaultPayload,
      ...payload,
    }

    return this.MockRoom.create(normalizedPayload)
  }

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
  contactPayload (id: string, payload: ContactPayload): void
  contactPayload (id: string): ContactPayload

  contactPayload (id: string, payload?: ContactPayload): void | ContactPayload {
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

  roomPayload (id: string, payload: RoomPayload): void
  roomPayload (id: string): RoomPayload

  roomPayload (id: string, payload?: RoomPayload): void | RoomPayload {
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

  messagePayload (id: string, payload: MessagePayload): void
  messagePayload (id: string): MessagePayload

  messagePayload (id: string, payload?: MessagePayload): void | MessagePayload {
    log.silly('Mocker', 'messagePayload(%s%s)', id, payload ? ',' + JSON.stringify(payload) : '')

    if (payload) {
      this.cacheMessagePayload.set(id, payload)

      const msg = this.MockMessage.load(payload.id)

      ;[
        msg.talker(),
        msg.room(),
        msg.listener(),
      ].forEach(e => e?.emit('message', msg))

      return
    }

    payload = this.cacheMessagePayload.get(id)
    if (!payload) {
      throw new Error('no payload found for id ' + id)
    }
    return payload
  }

}

export { Mocker }
