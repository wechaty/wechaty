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
 *
 *   @ignore
 */

import {
  Sayable,
  log,
}                       from '../config'
import {
  Contact,
  ContactType,
  Gender,
  Message,
}                       from '../puppet/'

import { MockMessage }  from './mock-message'

export class MockContact extends Contact implements Sayable {

  constructor(
    public readonly id: string,
  ) {
    super(id)
    log.silly('MockContact', `constructor(${id})`)
  }

  public toString(): string {
    return `MockContact<${this.id}>`
  }

  public async say(text: string)        : Promise<void>
  public async say(message: MockMessage): Promise<void>

  public async say(
    textOrMessage : string | MockMessage,
  ): Promise<void> {
    log.verbose('MockContact', 'say(%s)', textOrMessage)

    let msg

    if (textOrMessage instanceof Message) {
      msg = textOrMessage
    } else {
      msg = new MockMessage()
      msg.text(textOrMessage)
    }

    msg.from(this.puppet.userSelf())
    msg.to(this)

    await this.puppet.send(msg)
  }

  public name(): string {
    if (!this.payload) {
      throw new Error('no payload')
    }
    return this.payload.name || ''
  }

  public alias()                : string | null
  public alias(newAlias: string): Promise<void>
  public alias(empty: null)     : Promise<void>

  public alias(newAlias?: string|null): Promise<void> | string | null {
    log.verbose('MockContact', 'alias(%s)', newAlias)
    if (newAlias === undefined) {
      return this.payload && this.payload.alias || null
    }

    return this.puppet.contactAlias(this, newAlias)
  }

  /**
   * @deprecated
   */
  public stranger(): boolean | null {
    if (!this.payload) {
      return null
    }

    return this.payload.friend === undefined
      ? null
      : !(this.payload.friend)
  }

  public friend(): boolean | null {
    if (!this.payload) {
      return null
    }

    return this.payload.friend === undefined
      ? null
      : this.payload.friend
  }

  /**
   * @deprecated
   */
  public personal(): boolean {
    if (this.type() === ContactType.UNKNOWN) {
      throw new Error('unknown type')
    }
    return this.type() === Contact.Type.PERSONAL
  }

  /**
   * @deprecated
   */
  public official(): boolean {
    if (this.type() === ContactType.UNKNOWN) {
      throw new Error('unknown type')
    }
    return this.type() === Contact.Type.OFFICIAL
  }

  public type(): ContactType {
    if (!this.payload) {
      return ContactType.UNKNOWN
    }
    return this.payload.type
  }

  public star(): boolean | null {
    if (!this.payload) {
      return null
    }
    return this.payload.star === undefined
      ? null
      : this.payload.star
  }

  public gender(): Gender {
    if (!this.payload) {
      return Gender.UNKNOWN
    }
    return this.payload.gender
  }

  public province(): string | null {
    if (!this.payload) {
      return null
    }
    return this.payload.province === undefined
      ? null
      : this.payload.province
  }

  public city(): string | null {
    if (!this.payload) {
      return null
    }
    return this.payload.city === undefined
      ? null
      : this.payload.city
  }

  public async avatar(): Promise<NodeJS.ReadableStream> {
    log.verbose('MockContact', 'avatar()')

    return this.puppet.contactAvatar(this)
  }

  public isReady(): boolean {
    return this.payload !== undefined
  }

  /**
   * @deprecated use sync() instead
   */
  public async refresh(): Promise<void> {
    log.verbose('MockContact', 'refresh() DEPRECATED use sync instead')
    return this.sync()
  }

  public async sync(): Promise<void> {
    log.verbose('MockContact', 'sync()')
    this.payload = undefined
    await this.ready()
  }

  public async ready(): Promise<void> {
    log.verbose('MockContact', 'ready()')
    if (!this.payload) {
      this.payload = await this.puppet.contactPayload(this)
    }
  }

  public self(): boolean {
    const userSelf = this.puppet.userSelf()
    return userSelf.id === this.id
  }

  public weixin(): string | null {
    if (!this.payload) {
      throw new Error('no payload')
    }
    return this.payload.weixin || null
  }

}

export default MockContact
