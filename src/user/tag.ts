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
import { interfaceOfClass, looseInstanceOfClass } from 'clone-class'
import {
  log,
}                     from 'wechaty-puppet'

import type { Constructor }  from '../deprecated/clone-class.js'

import { Contact, ContactImpl }  from './contact.js'
import { Favorite, FavoriteImpl } from './favorite.js'

import {
  poolifyMixin,
  POOL,
}                     from './mixins/poolify.js'
import {
  wechatifyMixin,
}                     from './mixins/wechatify.js'

/**
 * FIXME: Issue #2273
 * @see https://github.com/wechaty/wechaty/issues/2273
 */
void POOL

class TagImpl extends wechatifyMixin(
  poolifyMixin<TagImpl>()(Object),
) {

  /**
   * @hideconstructor
   */
  constructor (
    public readonly id: string,
  ) {
    super()
    log.silly('Tag', `constructor(${id})`)
  }

  /**
   * Get a Tag instance for "tag"
   *
   * > Tips:
   * This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/Chatie/wechaty/wiki/Puppet#3-puppet-compatible-table)
   *
   * @static
   * @param {string} [tag] the tag name which want to create
   * @returns {Promise<TagImpl>}
   * @example
   * const bot = new Wechaty()
   * await bot.Tag.get('TagName')
   */
  static async get (
    tag: string,
  ): Promise<Tag> {
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

  /**
   * TODO: refactoring the target: do not use ContactIml or FavoriteImpl
   */
  static async delete (
    tag: Tag,
    target?: typeof ContactImpl | typeof FavoriteImpl,
  ): Promise<void> {
    log.verbose('Tag', 'static delete(%s)', tag)

    /**
     * Huan(202110) TODO: refactory this design:
     *  1. we should not pass `typeof ContactImpl` as argument
     *  2. find a better way to manage tag.
     */

    try {

      /**
       * TODO(huan): add tag check code here for checking if this tag is still being used.
       */

      if (!target || target === ContactImpl || target === this.wechaty.Contact) {
        await this.wechaty.puppet.tagContactDelete(tag.id)
      // TODO:
      // } else if (!target || target === Favorite || target === this.wechaty.Favorite) {
      //   await this.wechaty.puppet.tagFavoriteDelete(tag.id)
      }
    } catch (e) {
      log.error('Tag', 'static delete() exception: %s', (e as Error).message)
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
  async add (
    to: Contact | Favorite,
  ): Promise<void> {
    log.verbose('Tag', 'add(%s) for %s', to, this.id)

    /**
     * Huan(202110): TODO: refactory this design:
     *  1. we should not pass `typeof ContactImpl` as argument
     *  2. use instanceof to check the type of `to`
     */
    try {
      if (to instanceof ContactImpl) {
        await this.wechaty.puppet.tagContactAdd(this.id, to.id)
      } else if (to instanceof FavoriteImpl) {
        // TODO: await this.wechaty.puppet.tagAddFavorite(this.tag, to.id)
      }
    } catch (e) {
      log.error('Tag', 'add() exception: %s', (e as Error).message)
      throw new Error(`add error : ${(e as Error)}`)
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
  async remove (from: Contact | Favorite): Promise<void> {
    log.verbose('Tag', 'remove(%s) for %s', from, this.id)

    /**
     * Huan(202110): TODO: refactory this design:
     *  1. we should not pass `typeof ContactImpl` as argument
     *  2. use instanceof to check the type of `to`
     */

    try {
      if (from instanceof ContactImpl) {
        await this.wechaty.puppet.tagContactRemove(this.id, from.id)
      } else if (from instanceof FavoriteImpl) {
        // TODO await this.wechaty.puppet.tagRemoveFavorite(this.tag, from.id)
      }
    } catch (e) {
      log.error('Tag', 'remove() exception: %s', (e as Error).message)
      throw new Error(`remove error : ${e}`)
    }
  }

}

const interfaceOfTag  = interfaceOfClass(TagImpl)<Tag>()
const instanceOfTag   = looseInstanceOfClass(TagImpl)
const validTag = (o: any): o is Tag =>
  instanceOfTag(o) && interfaceOfTag(o)

interface Tag extends TagImpl {}
type TagConstructor = Constructor<
  Tag,
  typeof TagImpl
>

export type {
  TagConstructor,
  Tag,
}
export {
  TagImpl,
  interfaceOfTag,
  instanceOfTag,
  validTag,
}
