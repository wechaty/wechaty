import { instanceToClass } from 'clone-class'

import { log }        from '../config'
import { Accessory }  from '../accessory'

import { Contact }  from './contact'
import { Favorite } from './favorite'

export class Tag  extends Accessory {

  protected static pool: Map<string, Tag>

  private constructor (
    public readonly tag: string,
  ) {
    super()
    log.silly('Tag', `constructor(${tag})`)

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
  public static async findAll<T extends typeof Tag> (
    this: T,
    target: typeof Contact | typeof Favorite,
  ): Promise<Array<T['prototype']>> {
    log.verbose('Tag', 'findAll(%s)', target)

    const tagList: Tag[] = []

    if (target === Contact || target === this.wechaty.Contact) {
      const contactList = await this.wechaty.Contact.findAll()
      for (const contact of contactList) {
        const contactTagList = await contact.tags()
        contactTagList.forEach(tag => {
          if (!tagList.includes(tag)) {
              tagList.push(tag)
            }
          })
      }
    // } else if (target === Favorite || target === this.wechaty.Favorite)
    } else {
      log.error('Tag', 'findAll() target is neither Contact nor Favorite')
    }

    return tagList
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
   * await bot.Tag.get(tag)
   */
  public static async get<T extends typeof Tag> (
    this: T,
    tag: string,
  ): Promise<T['prototype']> {
    log.verbose('Tag', 'get(%s)', tag)
    return this.load(tag)
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
  public async add (
    to: Contact
  ): Promise<void> {
    log.verbose('Tag', 'add(%s) for %s', to, this.tag)

    try {
      await this.puppet.tagAddContact(this.tag, to.id)
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
  public async del (from: Contact): Promise<void> {
    log.verbose('Tag', 'del(%s) for %s', from, this.tag)

    try {
      await this.puppet.tagDelContact(this.tag, from)
    } catch (e) {
      log.error('Tag', 'del() exception: %s', e.message)
      throw new Error(`del error : ${e}`)
    }
  }

}
