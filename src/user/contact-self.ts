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

export class ContactSelf extends Contact {
  constructor (
    id: string,
  ) {
    super(id)
  }

  public async avatar ()              : Promise<FileBox>
  public async avatar (file: FileBox) : Promise<void>

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

  public async qrcode (): Promise<string> {
    log.verbose('Contact', 'qrcode()')

    if (this.id !== this.puppet.selfId()) {
      throw new Error('only can get qrcode for the login userself')
    }

    const qrcodeData = await this.puppet.contactQrcode(this.id)
    return qrcodeData
  }

}
