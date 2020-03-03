import { instanceToClass } from 'clone-class'

import {
  ImageType,
}                   from 'wechaty-puppet'

import { Accessory } from '../accessory'
import {
  FileBox,
  log,
}                   from '../config'

export class Image extends Accessory {

  constructor (
    public id: string,
  ) {
    super()
    log.verbose('Image', 'constructor(%s)',
      id,
      this.constructor.name,
    )

    const MyClass = instanceToClass(this, Image)

    if (MyClass === Image) {
      throw new Error('Image class can not be instanciated directly! See: https://github.com/wechaty/wechaty/issues/1217')
    }

    if (!this.puppet) {
      throw new Error('Image class can not be instanciated without a puppet!')
    }
  }

  public static create (id: string): Image {
    log.verbose('Image', 'static create(%s)', id)

    const image = new this(id)
    return image
  }

  public async thumbnail (): Promise<FileBox> {
    log.verbose('Image', 'thumbnail() for id: "%s"', this.id)
    const fileBox = await this.puppet.messageImage(this.id, ImageType.Thumbnail)
    return fileBox
  }

  public async hd (): Promise<FileBox> {
    log.verbose('Image', 'hd() for id: "%s"', this.id)
    const fileBox = await this.puppet.messageImage(this.id, ImageType.HD)
    return fileBox
  }

  public async artwork (): Promise<FileBox> {
    log.verbose('Image', 'artwork() for id: "%s"', this.id)
    const fileBox = await this.puppet.messageImage(this.id, ImageType.Artwork)
    return fileBox
  }

}
