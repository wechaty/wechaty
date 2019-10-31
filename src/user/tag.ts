import { log } from "../config"
import { Accessory } from "../accessory"
import { instanceToClass } from "clone-class"
import { Contact } from "./contact"
import { TagPayload } from "wechaty-puppet"

export class Tag  extends Accessory {

  constructor (
    public readonly id: string,
  ) {
    super()
    log.silly('Tag', `constructor(${id})`)

    const MyClass = instanceToClass(this, Tag)

    if (MyClass === Tag) {
      throw new Error(
        'Tag class can not be instanciated directly!'
        + 'See: https://github.com/Chatie/wechaty/issues/1217',
      )
    }

    if (!this.puppet) {
      throw new Error('Tag class can not be instanciated without a puppet!')
    }
  }

  /**
   * create a new tag
   */
  public async create (tag: string): Promise<TagPayload> {
    log.verbose('Tag', 'newTag()')

    try {
      return this.puppet.createTag(tag)
    } catch (e) {
      log.error('Tag', 'create() exception: %s', e.message)
      throw new Error(`error : ${e}`)
    }
  }

  /**
   * add a new tag
   */
  public async add (to: Contact): Promise<void> {
    log.verbose('Tag', 'newTag()')

    try {
      await this.puppet.addTag(to.id)
    } catch (e) {
      log.error('Tag', 'add() exception: %s', e.message)
      throw new Error(`error : ${e}`)
    }
  }

  /**
   * delete a new tag
   */
  public async del (from: Contact): Promise<void> {
    log.verbose('Tag', 'newTag()')

    try {
      await this.puppet.deleteTag(from.id)
    } catch (e) {
      log.error('Tag', 'del() exception: %s', e.message)
      throw new Error(`error : ${e}`)
    }
  }


}
