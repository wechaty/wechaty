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
  log,
}                     from 'wechaty-puppet'

import type { Constructor }  from 'clone-class'

import { ContactInterface, ContactImpl }  from './contact.js'
import { FavoriteInterface, FavoriteImpl } from './favorite.js'

import {
  poolifyMixin,
}                     from '../user-mixins/poolify.js'
import { validationMixin } from '../user-mixins/validation.js'
import {
  wechatifyMixinBase,
}                     from '../user-mixins/wechatify.js'

const MixinBase = poolifyMixin(
  wechatifyMixinBase(),
)<TagInterface>()

class TagMixin extends MixinBase {

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
  ): Promise<TagInterface> {
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
   * @returns {Promise<TagInterface[]>}
   * @example
   * const tag = wechaty.Tag.get('tag')
   * await wechaty.Tag.delete(tag)
   */

  /**
   * TODO: refactoring the target: do not use ContactIml or FavoriteImpl
   */
  static async delete (
    tag: TagInterface,
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
      this.wechaty.emitError(e)
      log.error('Tag', 'static delete() exception: %s', (e as Error).message)
    }
  }

  /**
   * Add tag for contact
   *
   * > Tips:
   * This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/Chatie/wechaty/wiki/Puppet#3-puppet-compatible-table)
   *
   * @param {ContactInterface} [to] the contact which need to add tag
   * @returns {Promise<void>}
   * @example
   * await tag.add(contact)
   */
  async add (
    to: ContactInterface | FavoriteInterface,
  ): Promise<void> {
    log.verbose('Tag', 'add(%s) for %s', to, this.id)

    /**
     * Huan(202110): TODO: refactory this design:
     *  1. we should not pass `typeof ContactImpl` as argument
     *  2. use instanceof to check the type of `to`
     */
    try {
      if (ContactImpl.valid(to)) {
        await this.wechaty.puppet.tagContactAdd(this.id, to.id)
      } else if (FavoriteImpl.valid(to)) {
        // TODO: await this.wechaty.puppet.tagAddFavorite(this.tag, to.id)
      }
    } catch (e) {
      this.wechaty.emitError(e)
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
  async remove (from: ContactInterface | FavoriteInterface): Promise<void> {
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
      this.wechaty.emitError(e)
      log.error('Tag', 'remove() exception: %s', (e as Error).message)
      throw new Error(`remove error : ${e}`)
    }
  }

}

class TagImpl extends validationMixin(TagMixin)<TagInterface>() {}
interface TagInterface extends TagImpl {}

type TagConstructor = Constructor<
  TagInterface,
  typeof TagImpl
>

export type {
  TagConstructor,
  TagInterface,
}
export {
  TagImpl,
}
