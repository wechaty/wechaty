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

import { log }        from '../config'
import { Wechaty }  from '../wechaty'

import { Contact }  from './contact'
import { Favorite } from './favorite'

class Tag {

  static get wechaty  (): Wechaty { throw new Error('This class can not be used directory. See: https://github.com/wechaty/wechaty/issues/2027') }
  get wechaty        (): Wechaty { throw new Error('This class can not be used directory. See: https://github.com/wechaty/wechaty/issues/2027') }

  protected static pool: Map<string, Tag>

  /**
   * @hideconstructor
   */
  constructor (
    public readonly id: string,
  ) {
    log.silly('Tag', `constructor(${id})`)

    const MyClass = instanceToClass(this, Tag)

    if (MyClass === Tag) {
      throw new Error(
        'Tag class can not be instantiated directly!'
        + 'See: https://github.com/Chatie/wechaty/issues/1217',
      )
    }

    if (!this.wechaty.puppet) {
      throw new Error('Tag class can not be instantiated without a puppet!')
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
   * Get a Tag instance for "tag"
   *
   * > Tips:
   * This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/Chatie/wechaty/wiki/Puppet#3-puppet-compatible-table)
   *
   * @static
   * @param {string} [tag] the tag name which want to create
   * @returns {Promise<Tag>}
   * @example
   * const bot = new Wechaty()
   * await bot.Tag.get('TagName')
   */
  public static async get<T extends typeof Tag> (
    this: T,
    tag: string,
  ): Promise<T['prototype']> {
    log.verbose('Tag', 'get(%s)', tag)
    return this.load(tag)
  }

  /**
   * Delete a tag from Wechat
   *
   * If you want to delete a tag, please make sure there's no more Contact/Favorite(s) are using this tag.
   * If this tag is be used by any Contact/Favorite, then it can not be deleted.
   * (This is for protecting the tag being deleted by mistake)
   *
   * @static
   * @returns {Promise<Tag[]>}
   * @example
   * const tag = wechaty.Tag.get('tag')
   * await wechaty.Tag.delete(tag)
   */
  public static async delete (
    tag: Tag,
    target?: typeof Contact | typeof Favorite,
  ): Promise<void> {
    log.verbose('Tag', 'static delete(%s)', tag)

    try {

      /**
       * TODO(huan): add tag check code here for checking if this tag is still being used.
       */

      if (!target || target === Contact || target === this.wechaty.Contact) {
        await this.wechaty.puppet.tagContactDelete(tag.id)
      // TODO:
      // } else if (!target || target === Favorite || target === this.wechaty.Favorite) {
      //   await this.wechaty.puppet.tagFavoriteDelete(tag.id)
      }
    } catch (e) {
      log.error('Tag', 'static delete() exception: %s', e.message)
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
  public async add (
    to: Contact | Favorite,
  ): Promise<void> {
    log.verbose('Tag', 'add(%s) for %s', to, this.id)

    try {
      if (to instanceof Contact) {
        await this.wechaty.puppet.tagContactAdd(this.id, to.id)
      } else if (to instanceof Favorite) {
        // TODO: await this.wechaty.puppet.tagAddFavorite(this.tag, to.id)
      }
    } catch (e) {
      log.error('Tag', 'add() exception: %s', e.message)
      throw new Error(`add error : ${e}`)
    }
  }

  /**
   * Remove this tag from Contact/Favorite
   *
   * > Tips:
   * This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/Chatie/wechaty/wiki/Puppet#3-puppet-compatible-table)
   *
   * @returns {Promise<void>}
   * @example
   * await tag.remove(contact)
   */
  public async remove (from: Contact | Favorite): Promise<void> {
    log.verbose('Tag', 'remove(%s) for %s', from, this.id)

    try {
      if (from instanceof Contact) {
        await this.wechaty.puppet.tagContactRemove(this.id, from.id)
      } else if (from instanceof Favorite) {
        // TODO await this.wechaty.puppet.tagRemoveFavorite(this.tag, from.id)
      }
    } catch (e) {
      log.error('Tag', 'remove() exception: %s', e.message)
      throw new Error(`remove error : ${e}`)
    }
  }

}

function wechatifyTag (wechaty: Wechaty): typeof Tag {

  class WechatifiedTag extends Tag {

    static get wechaty  () { return wechaty }
    get wechaty        () { return wechaty }

  }

  return WechatifiedTag

}

export {
  Tag,
  wechatifyTag,
}
