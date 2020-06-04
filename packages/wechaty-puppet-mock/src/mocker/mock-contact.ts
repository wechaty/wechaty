import cuid from 'cuid'

import { log } from '../config'
import { ContactPayload } from 'wechaty-puppet'
import { Mocker } from './mocker'
import { MockRoom } from './mock-room'
import { MessagePayloadTo, MessagePayloadBase, MessageType, MessagePayloadRoom, MessagePayload } from 'wechaty-puppet/dist/src/schemas/message'

interface To {
  to: (conversation: MockContact | MockRoom) => void
}

class MockContact {

  get id () { return this.payload.id }

  constructor (
    public mocker: Mocker,
    public payload: ContactPayload,
  ) {
    log.verbose('MockContact', 'constructor(%s, %s)', mocker, JSON.stringify(payload))
    this.mocker.contactPayload(payload.id, payload)

  }

  say (text: string): To {
    log.verbose('MockContact', 'say(%s)', text)

    const that = this
    return { to }

    function to (conversation: MockContact | MockRoom) {
      log.verbose('MockContact', 'say(%s).to(%s)', text, conversation.id)

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

      that.mocker.messagePayload(payload.id, payload)
      that.mocker.puppet.emit('message', { messageId: payload.id })
    }

  }

}

export { MockContact }
