/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2018 Huan LI <zixia@zixia.net>
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *   @ignore
 */
import * as path  from 'path'
import {
  Readable,
}                 from 'stream'

import {
  log,
}                   from '../config'
import { Message }  from '../puppet/'

import { MockContact }  from './mock-contact'
import { MockRoom }     from './mock-room'

import {
  WebMsgType,
  AppMsgType,
}                 from '../puppet/schemas/'

export type ParsedPath = Partial<path.ParsedPath>

export interface MockMessagePayload {
  text:   string,
  from:   MockContact,
  to?:    MockContact,
  room?:  MockRoom,
  type:   WebMsgType,
}

export class MockMessage extends Message {

  private payload: MockMessagePayload

  /**
   * Instance Properties & Methods
   */

  public readonly id: string

  constructor(
    fileOrObj?: string | Object,
  ) {
    super()
    log.silly('MockMessage', 'constructor()')

    this.payload = {} as MockMessagePayload
  }

  public from(contact: MockContact) : void
  public from()                     : MockContact

  public from(contact?: MockContact): void | MockContact {
    if (contact) {
      this.payload.from = contact
      return
    }

    return this.payload.from
  }

  public to(contact: MockContact) : void
  public to()                     : MockContact | null // if no `to` there must be a `room`

  public to(contact?: MockContact): void | MockContact | null {
    if (contact) {
      this.payload.to = contact
      return
    }

    return this.payload.to || null
  }

  public room(room: MockRoom) : void
  public room()               : null | MockRoom

  public room(room?: MockRoom): void | null | MockRoom {
    if (room) {
      this.payload.room = room
      return
    }
    return this.payload.room || null
  }

  public text(): string
  public text(content: string): this
  public text(text?: string): string | this {
    if (text) {
      this.payload.text = text
      return this
    }
    return this.payload.text || ''
  }

  public async say(text: string, mention?: MockContact | MockContact[]): Promise<void>
  public async say(message: MockMessage): Promise<void>

  public async say(
    textOrMessage:  string | MockMessage,
    mention?:       MockContact | MockContact[],
  ): Promise<void> {
    log.verbose('MockMessage', 'say(%s, %s)', textOrMessage, mention)

    if (textOrMessage instanceof Message) {
      await this.puppet.send(textOrMessage)
      return
    }

    const msg = new MockMessage()

    msg.from(this.puppet.userSelf())
    msg.to(this.from())

    const room = this.room()
    if (room) {
      msg.room(room)
    }

    // TODO: implement the `mention`

    await this.puppet.send(msg)
  }

  public type(): WebMsgType {
    return WebMsgType.TEXT
  }

  public self(): boolean {
    const userId = this.puppet.userSelf().id
    const fromId = this.from().id

    return fromId === userId
  }

  public mentioned(): MockContact[] {
    return []
  }

  public async ready(): Promise<this> {
    log.silly('MockMessage', 'ready()')
    await this.readyMedia()
    return this
  }

  public async readyMedia(): Promise<this> {
    log.silly('MockMessage', 'readyMedia()')
    return this
  }

  public async readyStream(): Promise<Readable> {
    log.verbose('MockMessage', 'readyStream()')
    throw new Error('to be mocked')
  }

  public filename(): string | null {
    return 'mocked_filename.txt'
  }

  public ext(): string {
    return '.mocked_ext'
  }

  public mimeType(): string | null {
    return 'text/plain'
  }

  public async forward(to: MockRoom | MockContact): Promise<void> {
    /**
     * 1. Text message
     */
    if (this.type() === WebMsgType.TEXT) {
      await to.say(this.text())
      return
    }

    /**
     * 2. Media message
     */
    try {
      await this.puppet.forward(this, to)
    } catch (e) {
      log.error('MockMessage', 'forward(%s) exception: %s', to, e)
      throw e
    }
  }

  public typeSub(): WebMsgType {
    return WebMsgType.TEXT
  }

  public typeApp(): AppMsgType {
    return AppMsgType.TEXT
  }

}

export default MockMessage
