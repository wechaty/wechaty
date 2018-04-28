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
import Message      from '../abstract-puppet/message'

import MockContact  from './mock-contact'
import MockRoom     from './mock-room'

import {
  MsgType,
  AppMsgType,
}                 from '../puppet-puppeteer/schema'

export type ParsedPath = Partial<path.ParsedPath>

export class MockMessage extends Message {
  public readonly id: string

  constructor(
    fileOrObj?: string | Object,
  ) {
    super()
    log.silly('MockMessage', 'constructor()')
  }

  public toString() {
    return `MockMessage`
  }

  public from(contact: MockContact): void
  public from(id: string): void
  public from(): MockContact
  public from(contact?: MockContact|string): MockContact|void {
    if (contact) {
      return
    }

    const loadedContact = MockContact.load('mockid') as MockContact
    loadedContact.puppet = this.puppet

    return loadedContact
  }

  public room(room: MockRoom): void
  public room(id: string): void
  public room(): MockRoom|null

  public room(room?: MockRoom|string): MockRoom|null|void {
    if (room) {
      return
    }
    return null
  }

  public text(): string
  public text(content: string): void
  public text(text?: string): string | void {
    if (text) {
      return
    }
    return 'mock text'
  }

  public async say(textOrMessage: string | MockMessage, replyTo?: MockContact|MockContact[]): Promise<void> {
    log.verbose('MockMessage', 'say(%s, %s)', textOrMessage, replyTo)
    const m = new MockMessage()
    await this.puppet.send(m)
  }

  public type(): MsgType {
    return MsgType.TEXT
  }

  public self(): boolean {
    const userId = this.puppet.user!.id
    const fromId = this.from().id

    if (!userId || !fromId) {
      throw new Error('no user or no from')
    }

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

  public static async find(query) {
    return Promise.resolve(new MockMessage({MsgId: '-1'}))
  }

  public static async findAll(query) {
    return Promise.resolve([
      new MockMessage({MsgId: '-2'}),
      new MockMessage({MsgId: '-3'}),
    ])
  }

  public to(contact: MockContact): void
  public to(id: string): void
  public to(): MockContact | null // if to is not set, then room must had set

  public to(contact?: MockContact | string): MockContact | MockRoom | null | void {
    if (contact) {
      return
    }

    const to = MockContact.load('mockid') as MockContact
    to.puppet = this.puppet

    return to
  }

  public async readyStream(): Promise<Readable> {
    log.verbose('MockMessage', 'readyStream()')
    throw new Error('to be mocked')
  }

  public filename(): string {
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
