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
  LocationPayload,
}                   from 'wechaty-puppet'

import { Wechaty } from '../wechaty'

import {
  log,
}               from '../config'

class Location {

  static get wechaty  (): Wechaty { throw new Error('This class can not be used directly. See: https://github.com/wechaty/wechaty/issues/2027') }
  get wechaty        (): Wechaty { throw new Error('This class can not be used directly. See: https://github.com/wechaty/wechaty/issues/2027') }

  /**
   *
   * Create from URL
   *
   */
  public static async create (): Promise<Location> {
    log.verbose('Location', 'create()')

    const payload: LocationPayload = {
      accuracy  : 15,
      address   : '北京市北京市海淀区45 Chengfu Rd',
      latitude  : 39.995120999999997,
      longitude : 116.334154,
      name      : '东升乡人民政府(海淀区成府路45号)',
    }

    return new Location(payload)
  }

  /*
   * @hideconstructor
   */
  constructor (
    public readonly payload: LocationPayload,
  ) {
    log.verbose('Location', 'constructor()')
  }

  public toString (): string {
    return `Location<${this.payload.name}>`
  }

  public address (): string {
    return this.payload.address
  }

  public latitude (): number {
    return this.payload.latitude
  }

  public longitude (): number {
    return this.payload.longitude
  }

  public name (): string {
    return this.payload.name
  }

  public accuracy (): string {
    return this.payload.accuracy
  }

}

function wechatifyLocation (_: any): typeof Location {

  return Location

}

export {
  Location,
  wechatifyLocation,
}
