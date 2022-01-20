/**
 *   Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
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
 */
import type * as PUPPET from 'wechaty-puppet'
import {
  log,
}                             from 'wechaty-puppet'
import type {
  FileBoxInterface,
}                             from 'file-box'

import type { Constructor }   from 'clone-class'

import {
  guardQrCodeValue,
}                       from '../pure-functions/guard-qr-code-value.js'

import {
  ContactImpl,
}                       from './contact.js'
import { validationMixin } from '../user-mixins/validation.js'
import { poolifyMixin } from '../user-mixins/poolify.js'

const MixinBase = poolifyMixin(
  ContactImpl,
)<ContactSelfInterface>()

/**
 * Bot itself will be encapsulated as a ContactSelf.
 *
 * > Tips: this class is extends Contact
 * @example
 * const bot = new Wechaty()
 * await bot.start()
 * bot.on('login', (user: ContactSelf) => {
 *   console.log(`user ${user} login`)
 * })
 */
class ContactSelfMixin extends MixinBase {

  static override async find (
    query : string | PUPPET.filters.Contact,
  ): Promise<undefined | ContactSelfInterface> {
    if (!this.wechaty.isLoggedIn) {
      return undefined
    }

    try {
      const contact = await super.find(query)
      if (contact && contact.id === this.wechaty.puppet.currentUserId) {
        return contact as ContactSelfInterface
      }
    } catch (e) {
      log.silly('ContactSelf', 'find() exception: %s', (e as Error).message)
    }
    return undefined
  }

  public override async avatar ()                       : Promise<FileBoxInterface>
  public override async avatar (file: FileBoxInterface) : Promise<void>

  /**
   * GET / SET bot avatar
   *
   * @param {FileBox} [file]
   * @returns {(Promise<void | FileBox>)}
   *
   * @example <caption> GET the avatar for bot, return {Promise<FileBox>}</caption>
   * // Save avatar to local file like `1-name.jpg`
   *
   * bot.on('login', (user: ContactSelf) => {
   *   console.log(`user ${user} login`)
   *   const file = await user.avatar()
   *   const name = file.name
   *   await file.toFile(name, true)
   *   console.log(`Save bot avatar: ${contact.name()} with avatar file: ${name}`)
   * })
   *
   * @example <caption>SET the avatar for a bot</caption>
   * import { FileBox }  from 'wechaty'
   * bot.on('login', (user: ContactSelf) => {
   *   console.log(`user ${user} login`)
   *   const fileBox = FileBox.fromUrl('https://wechaty.github.io/wechaty/images/bot-qr-code.png')
   *   await user.avatar(fileBox)
   *   console.log(`Change bot avatar successfully!`)
   * })
   *
   */
  public override async avatar (file?: FileBoxInterface): Promise<void | FileBoxInterface> {
    log.verbose('Contact', 'avatar(%s)', file ? file.name : '')

    if (!file) {
      const filebox = await super.avatar()
      return filebox
    }

    if (this.id !== this.wechaty.puppet.currentUserId) {
      throw new Error('set avatar only available for user self')
    }

    await this.wechaty.puppet.contactAvatar(this.id, file)
  }

  /**
   * Get bot qrcode
   *
   * @returns {Promise<string>}
   *
   * @example
   * import { generate } from 'qrcode-terminal'
   * bot.on('login', (user: ContactSelf) => {
   *   console.log(`user ${user} login`)
   *   const qrcode = await user.qrcode()
   *   console.log(`Following is the bot qrcode!`)
   *   generate(qrcode, { small: true })
   * })
   */
  public async qrcode (): Promise<string> {
    log.verbose('Contact', 'qrcode()')
    if (this.id !== this.wechaty.puppet.currentUserId) {
      throw new Error('only can get qrcode for the currentUser')
    }

    const qrcodeValue = await this.wechaty.puppet.contactSelfQRCode()
    return guardQrCodeValue(qrcodeValue)
  }

  /**
   * Change bot name
   *
   * @param name The new name that the bot will change to
   *
   * @example
   * bot.on('login', async user => {
   *   console.log(`user ${user} login`)
   *   const oldName = user.name()
   *   try {
   *     await user.name(`${oldName}-${new Date().getTime()}`)
   *   } catch (e) {
   *     console.error('change name failed', e)
   *   }
   * })
   */
  public override name (): string
  public override name (name: string): Promise<void>

  public override name (name?: string): string | Promise<void> {
    log.verbose('ContactSelf', 'name(%s)', name || '')

    if (typeof name === 'undefined') {
      return super.name()
    }

    if (this.id !== this.wechaty.puppet.currentUserId) {
      throw new Error('only can set name for user self')
    }

    return this.wechaty.puppet.contactSelfName(name).then(this.sync.bind(this))
  }

  /**
   * Change bot signature
   *
   * @param signature The new signature that the bot will change to
   *
   * @example
   * bot.on('login', async user => {
   *   console.log(`user ${user} login`)
   *   try {
   *     await user.signature(`Signature changed by wechaty on ${new Date()}`)
   *   } catch (e) {
   *     console.error('change signature failed', e)
   *   }
   * })
   */
  public async signature (signature: string): Promise<void> {
    log.verbose('ContactSelf', 'signature()')

    if (this.id !== this.wechaty.puppet.currentUserId) {
      throw new Error('only can change signature for user self')
    }

    return this.wechaty.puppet.contactSelfSignature(signature).then(this.sync.bind(this))
  }

}

class ContactSelfImpl extends validationMixin(ContactSelfMixin)<ContactSelfInterface>() {}
interface ContactSelfInterface extends ContactSelfImpl {}
type ContactSelfConstructor = Constructor<
  ContactSelfInterface,
  Omit<typeof ContactSelfImpl, 'load'>
>

export type {
  ContactSelfConstructor,
  ContactSelfInterface,
}
export {
  ContactSelfImpl,
}
