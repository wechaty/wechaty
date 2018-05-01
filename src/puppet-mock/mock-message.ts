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

import MockContact  from './mock-contact'
import MockRoom     from './mock-room'

import {
  MsgType,
  AppMsgType,
}                 from '../puppet-puppeteer/schema'

export type ParsedPath = Partial<path.ParsedPath>

export class MockMessage extends Message {

  /**
   * Static Methods
   */

  public static async find(query: any): Promise<MockMessage | null> {
    const messageList = await this.findAll(query)

    if (messageList.length <= 0) {
      return null
    }

    if (messageList.length > 1) {
      log.warn('MockMessage', 'find() return multiple results, return the first one.')
    }

    return messageList[0]
  }

  public static async findAll(query: any): Promise<MockMessage[]> {
    return Promise.resolve([
      new MockMessage({MsgId: '-2'}),
      new MockMessage({MsgId: '-3'}),
    ])
  }

  /**
   * Instance Properties & Methods
   */

  public readonly id: string

  constructor(
    fileOrObj?: string | Object,
  ) {
    super()
    log.silly('MockMessage', 'constructor()')
  }

  public from(contact: MockContact) : this
  public from()                     : MockContact

  public from(contact?: MockContact): this | MockContact {
    if (contact) {
      // set from to contact...
      return this
    }

    const loadedContact = MockContact.load('mockid')
    loadedContact.puppet = this.puppet

    return loadedContact
  }

  public room(room: MockRoom): this
  public room(): MockRoom | null

  public room(room?: MockRoom): this | MockRoom | null {
    if (room) {
      // set room to room...
      return this
    }
    return null
  }

  public text(): string
  public text(content: string): this
  public text(text?: string): string | this {
    if (text) {
      return this
    }
    return 'mock text'
  }

  public async say(
    textOrMessage: string | MockMessage,
    replyTo?: MockContact | MockContact[],
  ): Promise<void> {
    log.verbose('MockMessage', 'say(%s, %s)', textOrMessage, replyTo)
    const m = new MockMessage()
    await this.puppet.send(m)
  }

  public type(): MsgType {
    return MsgType.TEXT
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

  public to(contact: MockContact): this
  public to(id: string): this
  public to(): MockContact | null // if to is not set, then room must had set

  public to(contact?: MockContact | string): MockContact | null | this {
    if (contact) {
      return this
    }

    const to = MockContact.load('mockid') as MockContact
    to.puppet = this.puppet

    return to
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

  public async forward(to: MockRoom|MockContact): Promise<void> {
    /**
     * 1. Text message
     */
    if (this.type() === MsgType.TEXT) {
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

  public typeSub(): MsgType {
    return MsgType.TEXT
  }

  public typeApp(): AppMsgType {
    return AppMsgType.TEXT
  }

}

export default MockMessage
