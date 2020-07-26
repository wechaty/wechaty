import {
  EventRoomTopicPayload,
  RoomPayload,
  EventRoomJoinPayload,
  EventRoomLeavePayload,
  log,
}                           from 'wechaty-puppet'

import { Mocker } from '../mocker'

import { ContactMock } from './contact-mock'

import { RoomEventEmitter } from '../events/room-events'

interface By {
  by: (contact?: ContactMock) => void
}

const POOL = Symbol('pool')

class RoomMock extends RoomEventEmitter {

  static get mocker (): Mocker { throw new Error('This class can not be used directory. See: https://github.com/wechaty/wechaty/issues/2027') }
  get mocker       (): Mocker { throw new Error('This class can not be used directory. See: https://github.com/wechaty/wechaty/issues/2027') }

  protected static [POOL]: Map<string, RoomMock>

  protected static get pool () {
    if (!this[POOL]) {
      log.verbose('MockRoom', 'get pool() init pool')
      this[POOL] = new Map<string, RoomMock>()
    }

    if (this === RoomMock) {
      throw new Error(
        'The global MockRoom class can not be used directly!'
        + 'See: https://github.com/wechaty/wechaty/issues/1217',
      )
    }

    return this[POOL]
  }

  /**
   * @ignore
   * About the Generic: https://stackoverflow.com/q/43003970/1123955
   * @static
   * @param {string} id
   * @returns {Room}
   */
  public static load<T extends typeof RoomMock> (
    this : T,
    id   : string,
  ): T['prototype'] {
    const existingRoom = this.pool.get(id)
    if (!existingRoom) {
      throw new Error(`MockRoom.load(): ${id} not exist.`)
    }
    return existingRoom
  }

  public static create<T extends typeof RoomMock> (
    payload: RoomPayload,
  ): T['prototype'] {
    log.verbose('MockRoom', 'static create(%s)', JSON.stringify(payload))

    if (this.pool.get(payload.id)) {
      throw new Error('MockRoom id ' + payload.id + ' has already created before. Use `load(' + payload.id + ')` to get it back.')
    }

    // when we call `load()`, `this` should already be extend-ed a child class.
    // so we force `this as any` at here to make the call.
    const newRoom = new (this as any)(payload) as RoomMock
    this.pool.set(newRoom.id, newRoom)

    return newRoom
  }

  get id () { return this.payload.id }

  constructor (
    public payload: RoomPayload,
  ) {
    super()
    log.silly('MockRoom', 'constructor(%s)', JSON.stringify(payload))
    this.mocker.roomPayload(payload.id, payload)
  }

  topic (text: string): By {
    log.verbose('MockRoom', 'topic(%s)', text)

    const that = this
    return { by }

    function by (contact?: ContactMock) {
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

  add (...inviteeList: ContactMock[]): By {
    log.verbose('MockRoom', 'add(%s)', inviteeList.map(i => i.id).join(','))

    const that = this
    return { by }

    function by (inviter?: ContactMock) {
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

  remove (...removeeList: ContactMock[]): By {
    log.verbose('MockRoom', 'remove(%s)', removeeList.map(i => i.id).join(','))

    const that = this
    return { by }

    function by (remover?: ContactMock) {
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

function mockerifyRoomMock (mocker: Mocker): typeof RoomMock {

  class MockerifiedRoomMock extends RoomMock {

    static get mocker  () { return mocker }
    get mocker        () { return mocker }

  }

  return MockerifiedRoomMock

}

export {
  RoomMock,
  mockerifyRoomMock,
}
