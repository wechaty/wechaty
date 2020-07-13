import {
  MessagePayload, MessageType,
}                     from 'wechaty-puppet'

import { log } from '../../config'

import { AccessoryMock }        from '../accessory'

import { RoomMock }         from './room-mock'
import { ContactMock } from './contact-mock'

const POOL = Symbol('pool')

class MessageMock extends AccessoryMock {

  protected static [POOL]: Map<string, MessageMock>
  protected static get pool () {
    if (!this[POOL]) {
      log.verbose('MockMessage', 'get pool() init pool')
      this[POOL] = new Map<string, MessageMock>()
    }

    if (this === MessageMock) {
      throw new Error(
        'The global MockMessage class can not be used directly!'
        + 'See: https://github.com/wechaty/wechaty/issues/1217',
      )
    }

    return this[POOL]
  }

  /**
   * @ignore
   * About the Generic: https://stackoverflow.com/q/43003970/1123955
   *
   * @static
   * @param {string} id
   * @returns {MessageMock}
   */
  public static load<T extends typeof MessageMock> (
    this : T,
    id   : string,
  ): T['prototype'] {
    const existingMessage = this.pool.get(id)
    if (existingMessage) {
      return existingMessage
    }

    throw new Error(`MockMessage.load(): ${id} not exist.`)
  }

  public static create<T extends typeof MessageMock> (
    payload: MessagePayload,
  ): T['prototype'] {
    log.verbose('MockMessage', 'static create(%s)', JSON.stringify(payload))

    if (this.pool.get(payload.id)) {
      throw new Error('MockMessage id ' + payload.id + ' has already created before. Use `load(' + payload.id + ')` to get it back.')
    }

    // when we call `load()`, `this` should already be extend-ed a child class.
    // so we force `this as any` at here to make the call.
    const newMessage = new (this as any)(payload) as MessageMock
    this.pool.set(newMessage.id, newMessage)

    this.mocker.messagePayload(payload.id, payload)

    return newMessage
  }

  get id () { return this.payload.id }

  constructor (
    public payload: MessagePayload,
  ) {
    super('MockMessage')
    log.silly('MockMessage', 'constructor(%s)', JSON.stringify(payload))
  }

  talker (): ContactMock {
    log.verbose('MockMessage', 'talker()')

    if (!this.payload.fromId) {
      throw new Error('no fromId')
    }
    const contact = this.mocker.MockContact.load(this.payload.fromId)
    return contact
  }

  room (): undefined | RoomMock {
    log.verbose('MockMessage', 'room()')

    if (!this.payload.roomId) {
      return
    }
    const room = this.mocker.MockRoom.load(this.payload.roomId)
    return room
  }

  listener (): undefined | ContactMock {
    log.verbose('MockMessage', 'listener()')

    if (!this.payload.toId) {
      return undefined
    }
    const contact = this.mocker.MockContact.load(this.payload.toId)
    return contact
  }

  text (): undefined | string {
    log.verbose('MockMessage', 'text()')
    return this.payload.text
  }

  type (): MessageType {
    log.silly('MockMessage', 'text()')
    return this.payload.type
  }

  on (event: 'message', listener: (message: MessageMock) => void): this {
    super.on(event, listener)
    return this
  }

}

export { MessageMock }
