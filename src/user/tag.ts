import { log } from '../config'
import { Accessory } from '../accessory'
import { instanceToClass } from 'clone-class'
import { Contact } from './contact'
import { TagPayload } from 'wechaty-puppet'

export class Tag  extends Accessory {

  protected payload?: TagPayload
  protected static pool: Map<string, Tag>

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
   * @private
   * About the Generic: https://stackoverflow.com/q/43003970/1123955
   *
   * Get Tag by id
   * > Tips:
   * This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/Chatie/wechaty/wiki/Puppet#3-puppet-compatible-table)
   *
   * @static
   * @param {string} id
   * @returns {Tag}
   * @example
   * const bot = new Wechaty()
   * await bot.start()
   * const tag = bot.Tag.load('tagId')
   */
  public static load<T extends typeof Tag> (
    this : T,
    id   : string,
  ): T['prototype'] {
    if (!this.pool) {
      log.verbose('Tag', 'load(%s) init pool', id)
      this.pool = new Map<string, Tag>()
    }
    if (this === Tag) {
      throw new Error(
        'The global Tag class can not be used directly!'
        + 'See: https://github.com/Chatie/wechaty/issues/1217',
      )
    }
    if (this.pool === Tag.pool) {
      throw new Error('the current pool is equal to the global pool error!')
    }
    const existingTag = this.pool.get(id)
    if (existingTag) {
      return existingTag
    }

    const newTag = new (this as any)(id) as Tag

    this.pool.set(id, newTag)

    return newTag
  }

  /**
   * Get all tags of this account
   *
   * > Tips:
   * This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/Chatie/wechaty/wiki/Puppet#3-puppet-compatible-table)
   *
   * @static
   * @returns {Promise<Tag[]>}
   * @example
   * const bot = new Wechaty()
   * await bot.start()
   * await bot.Tag.findAll()
   */
  public static async findAll<T extends typeof Tag> (this: T): Promise<Array<T['prototype']>> {
    log.verbose('Tag', 'findAll()')

    try {
      const tags = await this.puppet.allTags()
      const invalidDict: { [id: string]: true } = {}

      const tagList = tags.map(tag => {
        const newTag = this.load(tag.id)
        newTag.payload = tag
        return newTag
      })
      return tagList.filter(tag => !invalidDict[tag.id])
    } catch (e) {
      log.error('Tag', 'findAll() exception: %s', e.message)
      throw new Error(`findAll error : ${e}`)
    }
  }

  /**
   * Get a new tag
   *
   * > Tips:
   * This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/Chatie/wechaty/wiki/Puppet#3-puppet-compatible-table)
   *
   * @static
   * @param {string} [tag] the tag name which want to create
   * @returns {Promise<Tag>}
   * @example
   * const bot = new Wechaty()
   * await bot.start()
   * await bot.Tag.get(tag)
   */
  public static async get<T extends typeof Tag> (this: T, tag: string): Promise<T['prototype']> {
    log.verbose('Tag', 'get()')

    try {
      const tagPayload: TagPayload = await this.puppet.getOrCreateTag(tag)
      const newTag = this.load(tagPayload.id)
      newTag.payload = tagPayload
      return newTag
    } catch (e) {
      log.error('Tag', 'get() exception: %s', e.message)
      throw new Error(`get error : ${e}`)
    }
  }

  /**
   * Add tag for contact
   *
   * > Tips:
   * This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/Chatie/wechaty/wiki/Puppet#3-puppet-compatible-table)
   *
   * @param {Contact} [to] the contact which need to add tag
   * @returns {Promise<void>}
   * @example
   * await tag.add(contact)
   */
  public async add (to: Contact): Promise<void> {
    log.verbose('Tag', 'add()')

    try {
      await this.puppet.addTag(this.id, to.id)
    } catch (e) {
      log.error('Tag', 'add() exception: %s', e.message)
      throw new Error(`add error : ${e}`)
    }
  }

  /**
   * Delete this tag
   *
   * > Tips:
   * This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/Chatie/wechaty/wiki/Puppet#3-puppet-compatible-table)
   *
   * @returns {Promise<void>}
   * @example
   * await tag.del()
   */
  public async del (): Promise<void> {
    log.verbose('Tag', 'del()')

    try {
      await this.puppet.deleteTag(this.id)
    } catch (e) {
      log.error('Tag', 'del() exception: %s', e.message)
      throw new Error(`del error : ${e}`)
    }
  }

  /**
   * Modify name for this tag
   *
   * > Tips:
   * This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/Chatie/wechaty/wiki/Puppet#3-puppet-compatible-table)
   *
   * @param {string} [name] the new name for this tag
   * @returns {Promise<void>}
   * @example
   * await tag.modify(name)
   */
  public async modify (name: string): Promise<void> {
    log.verbose('Tag', 'modify()')

    try {
      await this.puppet.modifyTag(this.id, name)
    } catch (e) {
      log.error('Tag', 'modify() exception: %s', e.message)
      throw new Error(`modify error : ${e}`)
    }
  }

}
