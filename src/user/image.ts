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
import {
  ImageType,
  FileBox,
  log,
}                   from 'wechaty-puppet'
import type { Constructor } from '../deprecated/clone-class.js'

import {
  EmptyBase,
  wechatifyMixin,
}                       from './mixins/wechatify.js'

class Image extends wechatifyMixin(EmptyBase) {

  static create (id: string): Image {
    log.verbose('Image', 'static create(%s)', id)

    const image = new this(id)
    return image
  }

  constructor (
    public id: string,
  ) {
    super()
    log.verbose('Image', 'constructor(%s)', id)
  }

  async thumbnail (): Promise<FileBox> {
    log.verbose('Image', 'thumbnail() for id: "%s"', this.id)
    const fileBox = await this.wechaty.puppet.messageImage(this.id, ImageType.Thumbnail)
    return fileBox
  }

  async hd (): Promise<FileBox> {
    log.verbose('Image', 'hd() for id: "%s"', this.id)
    const fileBox = await this.wechaty.puppet.messageImage(this.id, ImageType.HD)
    return fileBox
  }

  async artwork (): Promise<FileBox> {
    log.verbose('Image', 'artwork() for id: "%s"', this.id)
    const fileBox = await this.wechaty.puppet.messageImage(this.id, ImageType.Artwork)
    return fileBox
  }

}

interface ImageInterface extends Image { }
type ImageConstructor = Constructor<
  ImageInterface,
  typeof Image
>

export type {
  ImageConstructor,
  ImageInterface,
}
export {
  Image,
}
