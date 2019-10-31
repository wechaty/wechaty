import { log } from "../config"
import { Accessory } from "../accessory"
import { instanceToClass } from "clone-class"
import { Favorite } from "./favorite"
import { Contact } from "./contact"

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
  public async create (tag: string): Promise<Tag> {
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
  public async add (to: Contact | Favorite): Promise<Tag> {
    log.verbose('Tag', 'newTag()')

    try {
      return this.puppet.addTag(to)
    } catch (e) {
      log.error('Tag', 'add() exception: %s', e.message)
      throw new Error(`error : ${e}`)
    }
  }

  /**
   * delete a new tag
   */
  public async del (from: Contact | Favorite): Promise<string> {
    log.verbose('Tag', 'newTag()')

    try {
      return this.puppet.deleteTag(from)
    } catch (e) {
      log.error('Tag', 'del() exception: %s', e.message)
      throw new Error(`error : ${e}`)
    }
  }


}
