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
  log,
}                       from 'wechaty-puppet'
import {
  looseInstanceOfClass,
}                       from 'clone-class'

class Location {

  /**
   *
   * Create
   * @param poi string A point of interest (POI) is a specific point location that someone may find useful or interesting.
   *  See: https://en.wikipedia.org/wiki/Point_of_interest
   */
  public static async create (poi: string): Promise<Location> {
    log.verbose('Location', 'create(%s)', poi)

    const payload: LocationPayload = {
      accuracy  : 15, // in meters
      address   : '北京市北京市海淀区45 Chengfu Rd',
      latitude  : 39.995120999999997,
      longitude : 116.334154,
      name      : poi,  // Huan(202109): FIXME: generate payload by poi
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

  public accuracy (): number {
    return this.payload.accuracy
  }

}

function wechatifyLocation (_: any): typeof Location {

  return Location

}

const looseInstanceOfLocation = looseInstanceOfClass(Location)

export {
  Location,
  looseInstanceOfLocation,
  wechatifyLocation,
}
