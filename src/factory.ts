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
import type {
  Wechaty,
}                 from './interface/mod.js'

import {
  WechatyImpl,
  WechatyOptions,
}                 from './wechaty.js'

let singletonWechatyInstance: undefined | Wechaty

/**
 * Get the global instance of Wechaty
 *
 * @param {WechatyOptions} [options={}]
 *
 * @example <caption>The World's Shortest ChatBot Code: 6 lines of JavaScript</caption>
 * import { singletonWechaty } from 'wechaty'
 *
 * singletonWechaty() // Global instance
 * .on('scan', (url, status) => console.log(`Scan QR Code to login: ${status}\n${url}`))
 * .on('login',       user => console.log(`User ${user} logged in`))
 * .on('message',  message => console.log(`Message: ${message}`))
 * .start()
 */
const singletonWechaty = (options?: WechatyOptions): Wechaty => {
  if (options && singletonWechatyInstance) {
    throw new Error('Wechaty instance can be only initialized once with options!')
  }

  if (!singletonWechatyInstance) {
    singletonWechatyInstance = createWechaty(options)
  }

  return singletonWechatyInstance
}

/**
 * Create a Wechaty instance and return it as a interface
 */
const createWechaty = (options?: WechatyOptions): Wechaty => new WechatyImpl(options)

export {
  createWechaty,
  singletonWechaty,
}
