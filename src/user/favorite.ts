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

import type { Wechaty }  from '../wechaty.js'

import type { Tag }       from './tag.js'
import {
  guardWechatifyClass,
  throwWechatifyError,
}                         from './guard-wechatify-class.js'

class Favorite {

  static get wechaty (): Wechaty { return throwWechatifyError(this) }
  get wechaty        (): Wechaty { return throwWechatifyError(this.constructor) }

  public static list (): Favorite[] {
    return []
  }

  /**
   * Get tags for all favorites
   *
   * @static
   * @returns {Promise<Tag[]>}
   * @example
   * const tags = await wechaty.Favorite.tags()
   */
  public static async tags (): Promise<Tag []> {
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
    guardWechatifyClass.call(this, Favorite)
  }

  public async tags (): Promise<Tag []> {
    // TODO: implmente this method
    return []
  }

  public async findAll () {
    //
  }

}

function wechatifyFavorite (wechaty: Wechaty): typeof Favorite {
  log.verbose('Favorite', 'wechatifyFavorite(%s)', wechaty)

  class WechatifiedFavorite extends Favorite {

    static override get wechaty () { return wechaty }
    override get wechaty        () { return wechaty }

  }

  return WechatifiedFavorite

}

export {
  Favorite,
  wechatifyFavorite,
}
