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
  // config,
  Sayable,
  log,
}                       from '../config'

import {
  Contact,
  Gender,
}                       from '../puppet/'

// import PuppetMock        from './puppet-mock'
import MockMessage       from './mock-message'

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

  public async say(text: string): Promise<void>
  public async say(message: MockMessage): Promise<void>
  public async say(textOrMessage: string | MockMessage): Promise<void> {
    log.verbose('MockContact', 'say(%s)', textOrMessage)
  }

  public name() {
    return 'MockName'
  }

  public alias()                : string | null
  public alias(newAlias: string): Promise<void>
  public alias(empty: null)     : Promise<void>

  public alias(newAlias?: string|null): Promise<void> | string | null {
    log.verbose('MockContact', 'alias(%s)', newAlias)
    if (newAlias === undefined) {
      return 'MockAlias'
    }
    // pretend modified...
    return Promise.resolve()
  }

  public stranger(): boolean | null {
    return null
  }

  public official(): boolean {
    return false
  }
  public personal(): boolean {
    return !this.official()
  }

  public star(): boolean | null {
    return null
  }

  public gender(): Gender {
    return Gender.Unknown
  }

  public province() {
    return 'Guangdong'
  }

  public city() {
    return 'Shenzhen'
  }

  public async avatar(): Promise<NodeJS.ReadableStream> {
    log.verbose('MockContact', 'avatar()')

    throw new Error('To Be Mocked...')
  }

  public isReady(): boolean {
    return true
  }

  public async refresh(): Promise<this> {
    return this
  }

  public async ready(): Promise<this> {
    return this
  }

  public self(): boolean {
    return false
  }

  public weixin(): string | null {
    return null
  }

}

export default MockContact
