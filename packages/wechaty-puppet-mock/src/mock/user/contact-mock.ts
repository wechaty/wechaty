// import { Attachment } from './types'
import cuid from 'cuid'
import * as path from 'path'

import {
  MessagePayloadTo,
  MessagePayloadBase,
  MessageType,
  MessagePayloadRoom,
  MessagePayload,
}                        from 'wechaty-puppet/dist/src/schemas/message'
import {
  ContactPayload,
  FileBox,
  log,
}                         from 'wechaty-puppet'

import { Mocker }    from '../mocker'

import { RoomMock }    from './room-mock'
// import { MiniProgram, UrlLink } from 'wechaty'
import { generateSentence } from '../generator'

import { ContactEventEmitter } from '../events/contact-events'

interface To {
  to: (conversation?: ContactMock | RoomMock) => void
}

const POOL = Symbol('pool')

class ContactMock extends ContactEventEmitter {

  static get mocker (): Mocker { throw new Error('This class can not be used directory. See: https://github.com/wechaty/wechaty/issues/2027') }
  get mocker       (): Mocker { throw new Error('This class can not be used directory. See: https://github.com/wechaty/wechaty/issues/2027') }

  protected static [POOL]: Map<string, ContactMock>
  protected static get pool () {
    if (!this[POOL]) {
      log.verbose('MockContact', 'get pool() init pool')
      this[POOL] = new Map<string, ContactMock>()
    }

    if (this === ContactMock) {
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
   * @returns {ContactMock}
   */
  public static load<T extends typeof ContactMock> (
    this : T,
    id   : string,
  ): T['prototype'] {
    const existingContact = this.pool.get(id)
    if (existingContact) {
      return existingContact
    }

    throw new Error(`MockContact.load(): ${id} not exist.`)
  }

  public static create<T extends typeof ContactMock> (
    payload: ContactPayload,
  ): T['prototype'] {
    log.verbose('MockContact', 'static create(%s)', JSON.stringify(payload))

    if (this.pool.get(payload.id)) {
      throw new Error('MockContact id ' + payload.id + ' has already created before. Use `load(' + payload.id + ')` to get it back.')
    }

    // when we call `load()`, `this` should already be extend-ed a child class.
    // so we force `this as any` at here to make the call.
    const newContact = new (this as any)(payload) as ContactMock
    this.pool.set(newContact.id, newContact)

    return newContact
  }

  get id () { return this.payload.id }

  constructor (
    public payload: ContactPayload,
  ) {
    super()
    log.silly('MockContact', 'constructor(%s)', JSON.stringify(payload))
    this.mocker.contactPayload(payload.id, payload)
  }

  say (
    something?: string | FileBox, // | ContactMock, // | Attachment,
    mentions: ContactMock[] = []
  ): To {
    log.verbose('MockContact', 'say(%s%s)',
      something,
      mentions.length > 0
        ? `,[${mentions.map(c => c.id).join(',')}]`
        : '',
    )

    const that = this
    return { to }

    function to (conversation?: ContactMock | RoomMock) {
      log.verbose('MockContact', 'say(%s).to(%s)', something, conversation?.id || '')

      if (!conversation) {
        conversation = that.mocker.randomConversation()
      }

      const basePayload: MessagePayloadBase = {
        id        : cuid(),
        timestamp : Date.now(),
        type      : MessageType.Text,
      }

      let payload: MessagePayload

      if (something instanceof FileBox) {
      //   basePayload.type = MessageType.Contact
      // } else if (something instanceof FileBox) {
        const type = (something.mimeType && something.mimeType !== 'application/octet-stream')
          ? something.mimeType
          : path.extname(something.name)
        switch (type) {
          case 'image/jpeg':
          case 'image/png':
          case '.jpg':
          case '.jpeg':
          case '.png':
            basePayload.type = MessageType.Image
            break
          case 'video/mp4':
          case '.mp4':
            basePayload.type = MessageType.Audio
            break
          default:
            basePayload.type = MessageType.Unknown
            break
        }
      // } else if (something instanceof MiniProgram) {
      //   basePayload.type = MessageType.MiniProgram
      // } else if (something instanceof UrlLink) {
      //   basePayload.type = MessageType.Url
      } else {
        basePayload.text = something || generateSentence()
      }

      if (conversation instanceof ContactMock) {
        payload = {
          ...basePayload,
          fromId        : that.id,
          toId          : conversation.id,
        } as MessagePayloadBase & MessagePayloadTo
      } else if (conversation instanceof RoomMock) {
        payload = {
          ...basePayload,
          fromId        : that.id,
          mentionIdList : mentions.map(c => c.id),
          roomId        : conversation.id,
        } as MessagePayloadBase & MessagePayloadRoom
      } else {
        throw new Error('unknown conversation type: ' + typeof conversation)
      }
      // if (payload.type !== MessageType.Text && typeof something !== 'string' && something) {
      //   that.mocker.MockMessage.setAttachment(payload.id, something)
      // }
      const msg = that.mocker.MessageMock.create(payload)
      that.mocker.puppet.emit('message', { messageId: msg.id })
    }

  }

}

function mockerifyContactMock (mocker: Mocker): typeof ContactMock {

  class MockerifiedContactMock extends ContactMock {

    static get mocker  () { return mocker }
    get mocker        () { return mocker }

  }

  return MockerifiedContactMock

}

export {
  ContactMock,
  mockerifyContactMock,
}
