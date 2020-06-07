import cuid from 'cuid'

import {
  MessagePayloadTo,
  MessagePayloadBase,
  MessageType,
  MessagePayloadRoom,
  MessagePayload,
}                        from 'wechaty-puppet/dist/src/schemas/message'
import { ContactPayload } from 'wechaty-puppet'

import { log } from '../../config'

import { generateSentence } from '../generator'
import { MockAccessory }        from '../accessory'

import { MockRoom }         from './mock-room'

interface To {
  to: (conversation?: MockContact | MockRoom) => void
}

export const POOL = Symbol('pool')

class MockContact extends MockAccessory {

  protected static [POOL]: Map<string, MockContact>
  protected static get pool () {
    if (!this[POOL]) {
      log.verbose('MockContact', 'get pool() init pool')
      this[POOL] = new Map<string, MockContact>()
    }

    if (this === MockContact) {
      throw new Error(
        'The global MockContact class can not be used directly!'
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
   * @returns {MockContact}
   */
  public static load<T extends typeof MockContact> (
    this : T,
    id   : string,
  ): T['prototype'] {
    const existingContact = this.pool.get(id)
    if (existingContact) {
      return existingContact
    }

    throw new Error(`load(): ${id} not exist.`)
  }

  public static create<T extends typeof MockContact> (
    payload: ContactPayload,
  ): T['prototype'] {
    log.verbose('MockContact', 'static create(%s)', JSON.stringify(payload))

    if (this.pool.get(payload.id)) {
      throw new Error('MockContact id ' + payload.id + ' has already created before. Use `load(' + payload.id + ')` to get it back.')
    }

    // when we call `load()`, `this` should already be extend-ed a child class.
    // so we force `this as any` at here to make the call.
    const newContact = new (this as any)(payload) as MockContact
    this.pool.set(newContact.id, newContact)

    return newContact
  }

  get id () { return this.payload.id }

  constructor (
    public payload: ContactPayload,
  ) {
    super('MockContact')
    log.silly('MockContact', 'constructor(%s)', JSON.stringify(payload))
    this.mocker.contactPayload(payload.id, payload)
  }

  say (text?: string): To {
    log.verbose('MockContact', 'say(%s)', text || '')

    if (!text) {
      text = generateSentence()
    }

    const that = this
    return { to }

    function to (conversation?: MockContact | MockRoom) {
      log.verbose('MockContact', 'say(%s).to(%s)', text || '', conversation?.id || '')

      if (!conversation) {
        conversation = that.mocker.randomConversation()
      }

      const basePayload: MessagePayloadBase = {
        id        : cuid(),
        text,
        timestamp : Date.now(),
        type      : MessageType.Text,
      }

      let payload: MessagePayload

      if (conversation instanceof MockContact) {
        payload = {
          ...basePayload,
          fromId        : that.id,
          toId          : conversation.id,
        } as MessagePayloadBase & MessagePayloadTo
      } else if (conversation instanceof MockRoom) {
        payload = {
          ...basePayload,
          fromId       : that.id,
          roomId        : conversation.id,
        } as MessagePayloadBase & MessagePayloadRoom
      } else {
        throw new Error('unknown conversation type: ' + typeof conversation)
      }

      const msg = that.mocker.MockMessage.create(payload)
      that.mocker.puppet.emit('message', { messageId: msg.id })
    }

  }

}

export { MockContact }
