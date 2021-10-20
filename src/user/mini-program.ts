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
  log,
}                         from 'wechaty-puppet'
import type { Constructor } from '../deprecated/clone-class.js'

import {
  EmptyBase,
  wechatifyMixin,
}                       from './mixins/wechatify.js'

class MiniProgram extends wechatifyMixin(EmptyBase) {

  /**
   *
   * Create
   *
   */
  static async create (): Promise<MiniProgram> {
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

    return new this(payload)
  }

  /*
   * @hideconstructor
   */
  constructor (
    public readonly payload: MiniProgramPayload,
  ) {
    super()
    log.verbose('MiniProgram', 'constructor()')
    // Huan(202110): it is ok to create a raw one without wechaty instance
    // guardWechatifyClass.call(this, MiniProgram)
  }

  appid (): undefined | string {
    return this.payload.appid
  }

  title (): undefined | string {
    return this.payload.title
  }

  pagePath (): undefined | string {
    return this.payload.pagePath
  }

  username (): undefined | string {
    return this.payload.username
  }

  description (): undefined | string {
    return this.payload.description
  }

  thumbUrl (): undefined | string {
    return this.payload.thumbUrl
  }

  thumbKey (): undefined | string {
    return this.payload.thumbKey
  }

}

interface MiniProgramInterface extends MiniProgram {}
type MiniProgramConstructor = Constructor<
  MiniProgramInterface,
  typeof MiniProgram
>

export type {
  MiniProgramConstructor,
  MiniProgramInterface,
}
export {
  MiniProgram,
}
