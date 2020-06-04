import {
  EventRoomTopicPayload,
  RoomPayload,
  EventRoomJoinPayload,
  EventRoomLeavePayload,
}                           from 'wechaty-puppet'

import { log } from '../config'

import { Mocker } from './mocker'
import { MockContact } from './mock-contact'

interface By {
  by: (contact?: MockContact) => void
}

class MockRoom {

  get id () { return this.payload.id }

  constructor (
    public mocker: Mocker,
    public payload: RoomPayload,
  ) {
    log.silly('MockRoom', 'constructor(%s, %s)', mocker, JSON.stringify(payload))
    this.mocker.roomPayload(payload.id, payload)
  }

  topic (text: string): By {
    log.verbose('MockRoom', 'topic(%s)', text)

    const that = this
    return { by }

    function by (contact?: MockContact) {
      log.verbose('MockRoom', 'topic(%s).by(%s)', text, contact?.id || '')

      if (!contact) {
        contact = that.mocker.randomContact()
        if (!contact) {
          throw new Error('no contact found by mocker')
        }
      }

      const payload: EventRoomTopicPayload = {
        changerId : contact.id,
        newTopic  : text,
        oldTopic  : that.payload.topic,
        roomId    : that.payload.id,
        timestamp : Date.now(),
      }
      that.mocker.puppet.emit('room-topic', payload)
      that.payload.topic = text
    }
  }

  add (...inviteeList: MockContact[]): By {
    log.verbose('MockRoom', 'add(%s)', inviteeList.map(i => i.id).join(','))

    const that = this
    return { by }

    function by (inviter?: MockContact) {
      log.verbose('MockRoom', 'add(%s).by(%s)', inviteeList.map(i => i.id).join(','), inviter?.id || '')

      if (!inviter) {
        inviter = that.mocker.randomContact()
        if (!inviter) {
          throw new Error('no contact found by mocker')
        }
      }

      that.payload.memberIdList.push(...inviteeList.map(i => i.id))
      const payload: EventRoomJoinPayload = {
        inviteeIdList : inviteeList.map(i => i.id),
        inviterId     : inviter.id,
        roomId        : that.id,
        timestamp     : Date.now(),
      }

      that.mocker.puppet.emit('room-join', payload)
    }
  }

  remove (...removeeList: MockContact[]): By {
    log.verbose('MockRoom', 'remove(%s)', removeeList.map(i => i.id).join(','))

    const that = this
    return { by }

    function by (remover?: MockContact) {
      log.verbose('MockRoom', 'remove(%s).by(%s)', removeeList.map(i => i.id).join(','), remover?.id || '')

      if (!remover) {
        remover = that.mocker.randomContact()
        if (!remover) {
          throw new Error('no contact found by mocker')
        }
      }

      for (const removee of removeeList) {
        const index = that.payload.memberIdList.indexOf(removee.id)
        if (index > -1) {
          that.payload.memberIdList.splice(index, 1)
        }
      }

      const payload: EventRoomLeavePayload = {
        removeeIdList : removeeList.map(r => r.id),
        removerId     : remover.id,
        roomId        : that.id,
        timestamp     : Date.now(),
      }

      that.mocker.puppet.emit('room-leave', payload)
    }

  }

}

export { MockRoom }
