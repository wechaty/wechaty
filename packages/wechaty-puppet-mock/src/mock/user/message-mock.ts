// import { Attachment } from './types'
import {
  MessageType,
  MessagePayload,
  FileBox,
  log,
}                     from 'wechaty-puppet'

import { Mocker }        from '../mocker'

import { RoomMock }         from './room-mock'
import { ContactMock } from './contact-mock'
// import { UrlLink, MiniProgram } from 'wechaty'

const POOL = Symbol('pool')
// const ATTACHMENT = Symbol('attachment')

class MessageMock {

  static get mocker (): Mocker { throw new Error('This class can not be used directory. See: https://github.com/wechaty/wechaty/issues/2027') }
  get mocker       (): Mocker { throw new Error('This class can not be used directory. See: https://github.com/wechaty/wechaty/issues/2027') }

  protected static [POOL]: Map<string, MessageMock>
  // protected static [ATTACHMENT]: Map<string, Attachment>
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

  // protected static get attachmentPool () {
  //   if (!this[ATTACHMENT]) {
  //     log.verbose('Mock Message', 'get attachment pool () init pool')
  //     this[ATTACHMENT] = new Map()
  //   }

  //   if (this === MessageMock) {
  //     throw new Error(
  //       'The global MockMessage class can not be used directly!'
  //       + 'See: https://github.com/wechaty/wechaty/issues/1217',
  //     )
  //   }

  //   return this[ATTACHMENT]
  // }

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

  // public static setAttachment<T extends typeof MessageMock> (
  //   this: T,
  //   id: string,
  //   attachment: Attachment
  // ): void {
  //   log.verbose('MockMessage', 'static set attachment(%s) to (%s)', JSON.stringify(attachment), id)
  //   this.attachmentPool.set(id, attachment)
  // }

  // public static loadAttachment<T extends typeof MessageMock> (
  //   this : T,
  //   id   : string,
  // ): Attachment | undefined {
  //   return this.attachmentPool.get(id)
  // }

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
    log.silly('MockMessage', 'constructor(%s)', JSON.stringify(payload))
  }

  talker (): ContactMock {
    log.verbose('MockMessage', 'talker()')

    if (!this.payload.fromId) {
      throw new Error('no fromId')
    }
    const contact = this.mocker.ContactMock.load(this.payload.fromId)
    return contact
  }

  room (): undefined | RoomMock {
    log.verbose('MockMessage', 'room()')

    if (!this.payload.roomId) {
      return
    }
    const room = this.mocker.RoomMock.load(this.payload.roomId)
    return room
  }

  listener (): undefined | ContactMock {
    log.verbose('MockMessage', 'listener()')

    if (!this.payload.toId) {
      return undefined
    }
    const contact = this.mocker.ContactMock.load(this.payload.toId)
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

  async toContact (): Promise<ContactMock> {
    log.verbose('MockMessage', 'toContact()')

    if (this.type() !== MessageType.Contact) {
      throw new Error('message not a ShareCard')
    }

    const contactId = await this.mocker.puppet.messageContact(this.id)
    if (!contactId) {
      throw new Error(`can not get Contact id by message: ${contactId}`)
    }

    const contact = await this.mocker.ContactMock.load(contactId)
    return contact
  }

  // async toUrlLink (): Promise<UrlLink> {
  //   log.verbose('MockMessage', 'toUrlLink()')

  //   if (this.type() !== MessageType.Url) {
  //     throw new Error('message not a Url Link')
  //   }
  //   const urlLink = await this.mocker.puppet.messageUrl(this.id)
  //   return new UrlLink(urlLink)
  // }

  // async toMiniprogram (): Promise<MiniProgram> {
  //   log.verbose('MockMessage', 'toMiniProgram()')
  //   if (this.type() !== MessageType.MiniProgram) {
  //     throw new Error('message not a MiniProgram')
  //   }

  //   const miniprogram = await this.mocker.puppet.messageMiniProgram(this.id)
  //   return new MiniProgram(miniprogram)
  // }

  async toFileBox (): Promise<FileBox> {
    log.verbose('MockMessage', 'toFileBox()')
    if (this.type() === MessageType.Text) {
      throw new Error('message is a Text')
    }
    return this.mocker.puppet.messageFile(this.id)
  }

}

function mockerifyMessageMock (mocker: Mocker): typeof MessageMock {

  class MockerifiedMessageMock extends MessageMock {

    static get mocker  () { return mocker }
    get mocker        () { return mocker }

  }

  return MockerifiedMessageMock

}

export {
  MessageMock,
  mockerifyMessageMock,
}
