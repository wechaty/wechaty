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

import {
  WechatyInterface,
  WechatyImpl,
  type WechatyOptions,
}                     from './wechaty/mod.js'

interface BuilderInterface {
  build (options?: WechatyOptions): WechatyInterface
}

class WechatyBuilder implements BuilderInterface {

  private static _instance?: WechatyInterface

  static valid (target: any): target is WechatyInterface {
    return WechatyImpl.valid(target)
  }

  /**
   * Create an instance of Wechaty
   *
   * @param {WechatyOptions} [options={}]
   *
   * @example <caption>The World's Shortest ChatBot Code: 6 lines of JavaScript</caption>
   * import { WechatyBuilder } from 'wechaty'
   *
   * WechatyBuilder.build(options) // instance() for singleton mode
   *  .on('scan', (url, status) => console.log(`Scan QR Code to login: ${status}\n${url}`))
   *  .on('login',       user => console.log(`User ${user} logged in`))
   *  .on('message',  message => console.log(`Message: ${message}`))
   *  .start()
   */
  static build (options?: WechatyOptions): WechatyInterface {
    return WechatyBuilder.new().options(options).build()
  }

  /**
   * @param options is a `WechatyOptions` object, it can only be set once
   */
  static singleton (options?: WechatyOptions): WechatyInterface {
    const builder = new WechatyBuilder()
    if (options) {
      builder.options(options)
    }
    return builder.singleton().build()
  }

  protected static new (): WechatyBuilder { return new this() }
  protected constructor () {}

  protected _singleton = false
  protected _options: WechatyOptions = {}

  protected singleton (): WechatyBuilder {
    log.verbose('WechatyBuilder', 'singleton()')
    this._singleton = true
    return this
  }

  protected options (options?: WechatyOptions): WechatyBuilder {
    log.verbose('WechatyBuilder', 'singleton()')
    if (Object.keys(this._options).length > 0) {
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

  build (): WechatyInterface {
    if (this._singleton) {
      return this.singletonInstance()
    }
    return this.newInstance()
  }

  protected singletonInstance (): WechatyInterface {
    log.verbose('WechatyBuilder', 'singletonInstance()')
    if (!WechatyBuilder._instance) {
      WechatyBuilder._instance = this.newInstance()
    }
    return WechatyBuilder._instance
  }

  protected newInstance (): WechatyInterface {
    log.verbose('WechatyBuilder', 'newInstance()')
    return new WechatyImpl(this._options)
  }

}

export {
  type WechatyOptions,
  type BuilderInterface,
  WechatyBuilder,
}
