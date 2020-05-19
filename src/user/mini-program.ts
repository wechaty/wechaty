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
  MiniProgramPayload,
}                   from 'wechaty-puppet'

import {
  log,
}               from '../config'

export class MiniProgram {

  /**
   *
   * Create
   *
   */
  public static async create (): Promise<MiniProgram> {
    log.verbose('MiniProgram', 'create()')

    // TODO: get appid and username from wechat
    const payload: MiniProgramPayload = {
      appid              : 'todo',
      description        : 'todo',
      pagePath           : 'todo',
      thumbKey           : 'todo',
      thumbUrl           : 'todo',
      title              : 'todo',
      username           : 'todo',
    }

    return new MiniProgram(payload)
  }

  /*
   * @hideconstructor
   */
  constructor (
    public readonly payload: MiniProgramPayload,
  ) {
    log.verbose('MiniProgram', 'constructor()')
  }

  public appid (): undefined | string {
    return this.payload.appid
  }

  public title (): undefined | string {
    return this.payload.title
  }

  public pagePath (): undefined | string {
    return this.payload.pagePath
  }

  public username (): undefined | string {
    return this.payload.username
  }

  public description (): undefined | string {
    return this.payload.description
  }

  public thumbUrl (): undefined | string {
    return this.payload.thumbUrl
  }

  public thumbKey (): undefined | string {
    return this.payload.thumbKey
  }

}
