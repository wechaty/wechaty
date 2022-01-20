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
import type * as PUPPET          from 'wechaty-puppet'
import type { Constructor } from 'clone-class'
import { log } from '../config.js'

import { validationMixin }  from '../user-mixins/validation.js'
import {
  wechatifyMixinBase,
}                       from '../user-mixins/wechatify.js'

class LocationMixin extends wechatifyMixinBase() {

  /**
   *
   * Create
   * @param poi string A point of interest (POI) is a specific point location that someone may find useful or interesting.
   *  See: https://en.wikipedia.org/wiki/Point_of_interest
   */
  static async create (poi: string): Promise<LocationInterface> {
    log.verbose('Location', 'create(%s)', poi)

    const payload: PUPPET.payloads.Location = {
      accuracy  : 15, // in meters
      address   : '北京市北京市海淀区45 Chengfu Rd',
      latitude  : 39.995120999999997,
      longitude : 116.334154,
      name      : poi,  // Huan(202109): FIXME: generate payload by poi
    }

    return new this(payload)
  }

  /*
   * @hideconstructor
   */
  constructor (
    public readonly payload: PUPPET.payloads.Location,
  ) {
    super()
    log.verbose('Location', 'constructor()')
    // Huan(202110): it is ok to create a raw one without wechaty instance
    // guardWechatifyClass.call(this, Location)
  }

  override toString (): string {
    return `Location<${this.payload.name}>`
  }

  address (): string {
    return this.payload.address
  }

  latitude (): number {
    return this.payload.latitude
  }

  longitude (): number {
    return this.payload.longitude
  }

  name (): string {
    return this.payload.name
  }

  accuracy (): number {
    return this.payload.accuracy
  }

}

class LocationImpl extends validationMixin(LocationMixin)<LocationInterface>() {}
interface LocationInterface extends LocationImpl {}

type LocationConstructor = Constructor<
  LocationInterface,
  typeof LocationImpl
>

export type {
  LocationConstructor,
  LocationInterface,
}
export {
  LocationImpl,
}
