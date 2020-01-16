import { Tag } from './tag'

import { Accessory }  from '../accessory'
import { log }        from '../config'

export class Favorite extends Accessory {

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
    super()
    //
  }

  public async tags (): Promise<Tag []> {
    // TODO: implmente this method
    return []
  }

  public async findAll () {
    //
  }

}
