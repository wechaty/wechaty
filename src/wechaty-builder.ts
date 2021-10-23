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
import { log } from 'wechaty-puppet'

import type {
  Wechaty,
}                 from './interface/mod.js'
import {
  WechatyImpl,
  WechatyOptions,
}                 from './wechaty.js'

class WechatyBuilder {

  private static _instance?: Wechaty

  protected _singleton: boolean
  protected _options?: WechatyOptions

  constructor () {
    log.verbose('WechatyBuilder', 'constructor()')
    this._singleton = false
  }

  singleton (): WechatyBuilder {
    log.verbose('WechatyBuilder', 'singleton()')
    this._singleton = true
    return this
  }

  options (options?: WechatyOptions): WechatyBuilder {
    log.verbose('WechatyBuilder', 'singleton()')
    if (this._options) {
      throw new Error([
        'WechatyBuilder options() can only be set once',
        'Create a new WechatyBuilder if you need different options',
      ].join('\n'))
    }

    if (options) {
      this._options = options
    }

    return this
  }

  /**
   * Build a instance of Wechaty
   *
   * @param {WechatyOptions} [options={}]
   *
   * @example <caption>The World's Shortest ChatBot Code: 6 lines of JavaScript</caption>
   * import { WechatyBuilder } from 'wechaty'
   *
   * new WechatyBuilder()
   *  .singleton() // Global instance
   *  .options(options)
   *  .build() // return Wechaty instance
   *    .on('scan', (url, status) => console.log(`Scan QR Code to login: ${status}\n${url}`))
   *    .on('login',       user => console.log(`User ${user} logged in`))
   *    .on('message',  message => console.log(`Message: ${message}`))
   *    .start()
   */
  build (): Wechaty {
    if (this._singleton) {
      return this.singletonInstance()
    }
    return this.newInstance()
  }

  protected singletonInstance (): Wechaty {
    log.verbose('WechatyBuilder', 'singletonInstance()')
    if (!WechatyBuilder._instance) {
      WechatyBuilder._instance = this.newInstance()
    }
    return WechatyBuilder._instance
  }

  protected newInstance (): Wechaty {
    log.verbose('WechatyBuilder', 'newInstance()')
    return new WechatyImpl(this._options)
  }

}

export {
  WechatyBuilder,
}
