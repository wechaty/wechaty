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
import { log }        from 'wechaty-puppet'
import type { Constructor } from 'clone-class'
import { validationMixin } from '../user-mixins/validation.js'

import {
  wechatifyMixinBase,
}                       from '../user-mixins/wechatify.js'
import type { TagInterface } from './tag.js'

class FavoriteMixin extends wechatifyMixinBase() {

  static list (): FavoriteInterface[] {
    return []
  }

  /**
   * Get tags for all favorites
   *
   * @static
   * @returns {Promise<TagInterface[]>}
   * @example
   * const tags = await wechaty.Favorite.tags()
   */
  static async tags (): Promise<TagInterface[]> {
    log.verbose('Favorite', 'static tags() for %s', this)

    // TODO:
    // try {
    //   const tagIdList = await this.puppet.tagFavoriteList()
    //   const tagList = tagIdList.map(id => this.wechaty.Tag.load(id))
    //   return tagList
    // } catch (e) {
    //   log.error('Favorite', 'static tags() exception: %s', e.message)
    //   return []
    // }
    return []
  }

  /*
   * @hideconstructor
   */
  constructor () {
    super()
  }

  async tags (): Promise<TagInterface[]> {
    // TODO: implmente this method
    return []
  }

  async findAll () {
    //
  }

}

class FavoriteImpl extends validationMixin(FavoriteMixin)<FavoriteInterface>() {}
interface FavoriteInterface extends FavoriteImpl {}
type FavoriteConstructor = Constructor<
  FavoriteInterface,
  typeof FavoriteImpl
>

export type {
  FavoriteConstructor,
  FavoriteInterface,
}
export {
  FavoriteImpl,
}
