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
import { instanceToClass } from 'clone-class'

import {
  ImageType,
}                   from 'wechaty-puppet'

import { Wechaty } from '../wechaty'
import {
  FileBox,
  log,
}                   from '../config'

class Image {

  static get wechaty  (): Wechaty { throw new Error('This class can not be used directory. See: https://github.com/wechaty/wechaty/issues/2027') }
  get wechaty        (): Wechaty { throw new Error('This class can not be used directory. See: https://github.com/wechaty/wechaty/issues/2027') }

  constructor (
    public id: string,
  ) {
    log.verbose('Image', 'constructor(%s)',
      id,
      this.constructor.name,
    )

    const MyClass = instanceToClass(this, Image)

    if (MyClass === Image) {
      throw new Error('Image class can not be instantiated directly! See: https://github.com/wechaty/wechaty/issues/1217')
    }

    if (!this.wechaty.puppet) {
      throw new Error('Image class can not be instantiated without a puppet!')
    }
  }

  public static create (id: string): Image {
    log.verbose('Image', 'static create(%s)', id)

    const image = new this(id)
    return image
  }

  public async thumbnail (): Promise<FileBox> {
    log.verbose('Image', 'thumbnail() for id: "%s"', this.id)
    const fileBox = await this.wechaty.puppet.messageImage(this.id, ImageType.Thumbnail)
    return fileBox
  }

  public async hd (): Promise<FileBox> {
    log.verbose('Image', 'hd() for id: "%s"', this.id)
    const fileBox = await this.wechaty.puppet.messageImage(this.id, ImageType.HD)
    return fileBox
  }

  public async artwork (): Promise<FileBox> {
    log.verbose('Image', 'artwork() for id: "%s"', this.id)
    const fileBox = await this.wechaty.puppet.messageImage(this.id, ImageType.Artwork)
    return fileBox
  }

}

function wechatifyImage (wechaty: Wechaty): typeof Image {

  class WechatifiedImage extends Image {

    static get wechaty  () { return wechaty }
    get wechaty        () { return wechaty }

  }

  return WechatifiedImage

}

export {
  Image,
  wechatifyImage,
}
