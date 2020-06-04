import {
  EventRoomTopicPayload,
  RoomPayload,
}                           from 'wechaty-puppet'

import { log } from '../config'

import { Mocker } from './mocker'
import { MockContact } from './mock-contact'

interface By {
  by: (contact: MockContact) => void
}

class MockRoom {

  get id () { return this.payload.id }

  constructor (
    public mocker: Mocker,
    public payload: RoomPayload,
  ) {
    log.verbose('MockRoom', 'constructor(%s, %s)', mocker, JSON.stringify(payload))
    this.mocker.roomPayload(payload.id, payload)
  }

  topic (text: string): By {
    const that = this
    function by (contact: MockContact) {
      const payload: EventRoomTopicPayload = {
        changerId : contact.id,
        newTopic  : text,
        oldTopic  : string,
        roomId    : string,
        timestamp : number,
      }
      that.puppet.emit('room-topic', payload)
    }
    return { by }
  }
}

export { MockRoom }
