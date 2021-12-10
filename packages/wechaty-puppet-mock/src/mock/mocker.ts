import cuid from 'cuid'
import * as PUPPET  from 'wechaty-puppet'

import type { PuppetMock } from '../puppet-mock.js'
import { log } from '../config.js'

import {
  ContactMock,
  RoomMock,
  MessageMock,

  mockerifyContactMock,
  mockerifyMessageMock,
  mockerifyRoomMock,
}                         from './user/mod.js'

import { urnRegistry } from './uuid-file-box.js'
import {
  generateContactPayload,
  generateRoomPayload,
}                           from './generator.js'
import type { EnvironmentMock } from './environment.js'

class Mocker {

  id: string

  cacheContactPayload : Map<string, PUPPET.payloads.Contact>
  cacheRoomPayload    : Map<string, PUPPET.payloads.Room>
  cacheMessagePayload : Map<string, PUPPET.payloads.Message>

  protected mockerifiedContactMock? : typeof ContactMock
  protected mockerifiedMessageMock? : typeof MessageMock
  protected mockerifiedRoomMock?    : typeof RoomMock

  get ContactMock () : typeof ContactMock { return this.mockerifiedContactMock! }
  get MessageMock () : typeof MessageMock { return this.mockerifiedMessageMock! }
  get RoomMock    () : typeof RoomMock    { return this.mockerifiedRoomMock!    }

  protected environmentList          : EnvironmentMock[]
  protected environmentCleanupFnList : (() => void)[]

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

    this.environmentList          = []
    this.environmentCleanupFnList = []

    this.cacheContactPayload = new Map()
    this.cacheMessagePayload = new Map()
    this.cacheRoomPayload    = new Map()

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

    urnRegistry.init()
    this.environmentCleanupFnList.push(() => urnRegistry.destroy())

    this.environmentList.forEach(behavior => {
      log.verbose('Mocker', 'start() enabling behavior %s', behavior.name)
      const stop = behavior(this)
      this.environmentCleanupFnList.push(stop)
    })
  }

  stop () {
    log.verbose('Mocker', 'stop()')
    let n = 0
    this.environmentCleanupFnList.forEach(fn => {
      log.verbose('Mocker', 'stop() cleaning behavior #%s', n++)
      fn()
    })
    this.environmentCleanupFnList.length = 0
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
    this.puppet.emit('scan', { qrcode, status })
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

      msg.room()?.emit('message', msg)
      msg.talker().emit('message', msg)
      msg.listener()?.emit('message', msg)

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
