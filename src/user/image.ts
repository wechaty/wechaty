import { instanceToClass } from "clone-class"
import { Accessory } from "../accessory"
import { log }        from '../config'
import FileBox from "file-box"
import { MessageImageType } from "wechaty-puppet/dist/src/schemas/message"

export class Image extends Accessory {

  public static load (id: string): Image {
    log.verbose('Message', 'static load(%s)', id)

    /**
     * Must NOT use `Message` at here
     * MUST use `this` at here
     *
     * because the class will be `cloneClass`-ed
     */
    const image = new this(id)

    return image
  }

  /*
   * @hideconstructor
   */
  constructor (public id: string) {
    super()
    log.verbose('Image', 'constructor(%s) for class %s',
      id || '',
      this.constructor.name,
    )

    // tslint:disable-next-line:variable-name
    const MyClass = instanceToClass(this, Image)

    if (MyClass === Image) {
      throw new Error('Image class can not be instanciated directly! See: https://github.com/wechaty/wechaty/issues/1217')
    }

    if (!this.puppet) {
      throw new Error('Image class can not be instanciated without a puppet!')
    }
  }

  public async url (): Promise<string> {
    return this.puppet.messageImage(this.id, MessageImageType.URL)
  }

  public async thumbnail (): Promise<FileBox> {
    const url = await this.puppet.messageImage(this.id, MessageImageType.THUMBNAIL)
    return FileBox.fromUrl(url)
  }

  public async hd (): Promise<FileBox> {
    const url = await this.puppet.messageImage(this.id, MessageImageType.HD)
    return FileBox.fromUrl(url)
  }

  public async artwork (): Promise<FileBox> {
    const url = await this.puppet.messageImage(this.id, MessageImageType.ARTWORK)
    return FileBox.fromUrl(url)
  }

}
