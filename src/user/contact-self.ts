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
import { FileBox } from 'file-box'

import {
  log,
}           from '../config'

import {
  Contact,
}           from './contact'

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
export class ContactSelf extends Contact {
  constructor (
    id: string,
  ) {
    super(id)
  }

  public async avatar ()              : Promise<FileBox>
  public async avatar (file: FileBox) : Promise<void>

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
   * import { FileBox }  from 'file-box'
   * bot.on('login', (user: ContactSelf) => {
   *   console.log(`user ${user} login`)
   *   const fileBox = FileBox.fromUrl('https://chatie.io/wechaty/images/bot-qr-code.png')
   *   await user.avatar(fileBox)
   *   console.log(`Change bot avatar successfully!`)
   * })
   *
   */
  public async avatar (file?: FileBox): Promise<void | FileBox> {
    log.verbose('Contact', 'avatar(%s)', file ? file.name : '')

    if (!file) {
      const filebox = await super.avatar()
      return filebox
    }

    if (this.id !== this.puppet.selfId()) {
      throw new Error('set avatar only available for user self')
    }

    await this.puppet.contactAvatar(this.id, file)
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

    if (this.id !== this.puppet.selfId()) {
      throw new Error('only can get qrcode for the login userself')
    }

    const qrcodeData = await this.puppet.contactQrcode(this.id)
    return qrcodeData
  }

}
