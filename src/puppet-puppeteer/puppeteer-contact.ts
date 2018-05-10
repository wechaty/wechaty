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
  Raven,
  Sayable,
  log,
}                       from '../config'

import {
  Contact,
  // ContactPayload,
  Gender,
  ContactType,
}                       from '../puppet/'

import Misc             from '../misc'

import PuppeteerMessage from './puppeteer-message'

export class PuppeteerContact extends Contact implements Sayable {

  constructor(
    public readonly id: string,
  ) {
    super(id)
    log.silly('PuppeteerContact', `constructor(${id})`)

    if (typeof id !== 'string') {
      throw new Error('id must be string. found: ' + typeof id)
    }
  }

  public async say(text: string)              : Promise<void>
  public async say(message: PuppeteerMessage) : Promise<void>

  public async say(textOrMessage: string | PuppeteerMessage): Promise<void> {
    log.verbose('PuppeteerContact', 'say(%s)', textOrMessage)

    const user = this.puppet.userSelf() as PuppeteerContact

    if (!user) {
      throw new Error('no user')
    }

    let m
    if (typeof textOrMessage === 'string') {
      m = new PuppeteerMessage()
      m.puppet = this.puppet
      m.text(textOrMessage)
    } else if (textOrMessage instanceof PuppeteerMessage) {
      m = textOrMessage
    } else {
      throw new Error('not support args')
    }
    m.from(user)
    m.to(this)

    log.silly('PuppeteerContact', 'say() from: %s to: %s content: %s',
                                  user,
                                  this,
                                  textOrMessage,
              )
    await this.puppet.send(m)
  }

  public name(): string {
    return Misc.plainText(this.payload && this.payload.name || '')
  }

  public alias()                  : string | null
  public alias(newAlias:  string) : Promise<void>
  public alias(empty:     null)   : Promise<void>

  public alias(newAlias?: null | string): null | string | Promise<void> {
    log.verbose('PuppeteerContact', 'alias(%s)', newAlias)

    if (typeof newAlias === 'undefined') {
      return this.payload && this.payload.alias || null
    }

    const future = this.puppet.contactAlias(this, newAlias)

    future
    .then(() => this.payload!.alias = newAlias)
    .catch(e => {
      log.error('PuppeteerContact', 'alias(%s) rejected: %s', newAlias, e.message)
      Raven.captureException(e)
    })

    return future
  }

  public friend(): boolean | null {
    log.verbose('PuppeteerContact', 'friend()')
    if (!this.payload) return null
    return this.payload.friend || null
  }

  public stranger(): boolean | null {
    log.warn('PuppeteerContact', 'stranger() DEPRECATED. use friend() instead.')
    if (!this.payload) return null
    return !this.friend()
  }

  public official(): boolean {
    return !!this.payload && this.payload.type === ContactType.OFFICIAL
  }

  // public special(): boolean {
  //   return !!this.payload && this.payload.special
  // }

  public personal(): boolean {
    return !this.official()
  }

  public type(): ContactType {
    return this.payload!.type
  }

  public star(): boolean|null {
    if (!this.payload) return null
    return this.payload.star === undefined
      ? null
      : this.payload.star
  }

  public gender(): Gender {
    return this.payload
      ? this.payload.gender
      : Gender.UNKNOWN
  }

  public province() {
    return this.payload && this.payload.province || null
  }

  public city() {
    return this.payload && this.payload.city || null
  }

  public async avatar(): Promise<NodeJS.ReadableStream> {
    log.verbose('PuppeteerContact', 'avatar()')

    return this.puppet.contactAvatar(this)
  }

  public isReady(): boolean {
    return !!(this.payload && this.payload.name)
  }

  public async sync(): Promise<void> {
    // TODO: make sure the contact.* works when we are refreshing the data
    // if (this.isReady()) {
    //   this.dirtyObj = this.obj
    // }
    this.payload = undefined
    await this.ready()
  }

  public refresh() {
    return this.sync()
  }

  public async ready(): Promise<void> {
    log.silly('PuppeteerContact', 'ready()')

    if (this.isReady()) { // already ready
      log.silly('PuppeteerContact', 'ready() isReady() true')
      return
    }

    try {
      this.payload = await this.puppet.contactPayload(this)
      log.silly('PuppeteerContact', `ready() this.puppet.contactPayload(%s) resolved`, this)
      // console.log(this.payload)

    } catch (e) {
      log.error('PuppeteerContact', `ready() this.puppet.contactPayload(%s) exception: %s`,
                                    this,
                                    e.message,
                )
      Raven.captureException(e)
      throw e
    }
  }

  public self(): boolean {
    const user = this.puppet.userSelf()

    if (!user) {
      return false
    }

    const userId = user.id

    return this.id === userId
  }

  public weixin(): string | null {
    const wxId = this.payload && this.payload.weixin || null
    if (!wxId) {
      log.verbose('PuppeteerContact', `weixin() is not able to always work, it's limited by Tencent API`)
      log.verbose('PuppeteerContact', 'weixin() If you want to track a contact between sessions, see FAQ at')
      log.verbose('PuppeteerContact', 'https://github.com/Chatie/wechaty/wiki/FAQ#1-how-to-get-the-permanent-id-for-a-contact')
    }
    return wxId
  }

}

export default PuppeteerContact
