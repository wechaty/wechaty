import {
  MessagePayload,
}                     from 'wechaty-puppet'

import { log } from '../../config'

import { MockAccessory }        from '../accessory'

import { MockRoom }         from './mock-room'
import { MockContact } from './mock-contact'

export const POOL = Symbol('pool')

class MockMessage extends MockAccessory {

  protected static [POOL]: Map<string, MockMessage>
  protected static get pool () {
    if (!this[POOL]) {
      log.verbose('MockMessage', 'get pool() init pool')
      this[POOL] = new Map<string, MockMessage>()
    }

    if (this === MockMessage) {
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
   * @returns {MockMessage}
   */
  public static load<T extends typeof MockMessage> (
    this : T,
    id   : string,
  ): T['prototype'] {
    const existingMessage = this.pool.get(id)
    if (existingMessage) {
      return existingMessage
    }

    throw new Error(`load(): ${id} not exist.`)
  }

  public static create<T extends typeof MockMessage> (
    payload: MessagePayload,
  ): T['prototype'] {
    log.verbose('MockMessage', 'static create(%s)', JSON.stringify(payload))

    if (this.pool.get(payload.id)) {
      throw new Error('MockMessage id ' + payload.id + ' has already created before. Use `load(' + payload.id + ')` to get it back.')
    }

    // when we call `load()`, `this` should already be extend-ed a child class.
    // so we force `this as any` at here to make the call.
    const newMessage = new (this as any)(payload) as MockMessage
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

  talker (): MockContact {
    log.verbose('MockMessage', 'talker()')

    if (!this.payload.fromId) {
      throw new Error('no fromId')
    }
    const contact = this.mocker.MockContact.load(this.payload.fromId)
    return contact
  }

  room (): undefined | MockRoom {
    log.verbose('MockMessage', 'room()')

    if (!this.payload.roomId) {
      return
    }
    const room = this.mocker.MockRoom.load(this.payload.roomId)
    return room
  }

  listener (): undefined | MockContact {
    log.verbose('MockMessage', 'listener()')

    if (!this.payload.toId) {
      return undefined
    }
    const contact = this.mocker.MockContact.load(this.payload.toId)
    return contact
  }

}

export { MockMessage }
