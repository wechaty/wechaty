import {
  Puppet,
  ContactPayload,
  RoomPayload,
  MessagePayload,
  ScanStatus,
}                     from 'wechaty-puppet'

import { log } from '../config'

import { MockContact }  from './mock-contact'
import { MockRoom }     from './mock-room'
import {
  generateContactPayload,
  generateRoomPayload,
}                           from './generator'

class Mocker {

  protected cacheContactPayload : Map<string, ContactPayload>
  protected cacheRoomPayload    : Map<string, RoomPayload>
  protected cacheMessagePayload : Map<string, MessagePayload>

  constructor (
    public puppet: Puppet,
  ) {
    log.verbose('Mocker', 'constructor(%s)', puppet)

    this.cacheContactPayload = new Map()
    this.cacheRoomPayload    = new Map()
    this.cacheMessagePayload = new Map()
  }

  /**
   *
   * Events
   *
   */
  scan (qrcode: string, status: ScanStatus = ScanStatus.Waiting) {
    this.puppet.emit('scan', { qrcode, status })
  }

  login (user: MockContact) {
    this.puppet.emit('login', { contactId: user.id })
  }

  /**
   *
   * Creators for MockContacts / MockRooms
   *
   */
  createContact (payload?: Partial<ContactPayload>): MockContact {
    log.verbose('Mocker', 'createContact(%s)', JSON.stringify(payload))

    const defaultPayload = generateContactPayload()
    const normalizedPayload: ContactPayload = {
      ...defaultPayload,
      ...payload,
    }
    return new MockContact(this, normalizedPayload)
  }

  createContacts (num: number): MockContact[] {
    log.verbose('Mocker', 'createContacts(%s)', num)

    const contactList = [] as MockContact[]

    while (num--) {
      const contact = this.createContact()
      contactList.push(contact)
    }

    return contactList
  }

  createRoom (payload?: Partial<RoomPayload>): MockRoom {
    log.verbose('Mocker', 'createRoom(%s)', JSON.stringify(payload))

    const defaultPayload = generateRoomPayload(...this.cacheContactPayload.keys())

    const normalizedPayload: RoomPayload = {
      ...defaultPayload,
      ...payload,
    }

    return new MockRoom(this, normalizedPayload)
  }

  createRooms (num: number): MockRoom[] {
    log.verbose('Mocker', 'createRooms(%s)', num)
    const roomList = [] as MockRoom[]

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
    log.verbose('Mocker', 'contactPayload(%s%s)', id, payload ? ',' + JSON.stringify(payload) : '')

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
    log.verbose('Mocker', 'roomPayload(%s%s)', id, payload ? ',' + JSON.stringify(payload) : '')

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
    log.verbose('Mocker', 'messagePayload(%s%s)', id, payload ? ',' + JSON.stringify(payload) : '')

    if (payload) {
      this.cacheMessagePayload.set(id, payload)
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
