import cuid from 'cuid'

import {
  MessagePayloadTo,
  MessagePayloadBase,
  MessageType,
  MessagePayloadRoom,
  MessagePayload,
}                        from 'wechaty-puppet/dist/src/schemas/message'
import { ContactPayload } from 'wechaty-puppet'

import { log } from '../config'

import { Mocker }           from './mocker'
import { MockRoom }         from './mock-room'
import { generateSentence } from './generator'

interface To {
  to: (conversation?: MockContact | MockRoom) => void
}

class MockContact {

  get id () { return this.payload.id }

  constructor (
    public mocker: Mocker,
    public payload: ContactPayload,
  ) {
    log.silly('MockContact', 'constructor(%s, %s)', mocker, JSON.stringify(payload))
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

      that.mocker.messagePayload(payload.id, payload)
      that.mocker.puppet.emit('message', { messageId: payload.id })
    }

  }

}

export { MockContact }
