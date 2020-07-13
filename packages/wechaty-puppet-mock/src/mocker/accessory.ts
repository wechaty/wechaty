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
import { EventEmitter }     from 'events'

import { instanceToClass }  from 'clone-class'

import { log }    from '../config'
import { Mocker } from './mocker'

const MOCKER = Symbol('mocker')

let COUNTER = 0

abstract class AccessoryMock extends EventEmitter {

  #name    : string
  #counter : number

  /**
   *
   * 1. Static Properties & Methods
   *
   */
  private static [MOCKER] : Mocker

  /**
   * @ignore
   */
  public static set mocker (mocker: Mocker) {
    log.silly('MockAccessory', '<%s> static set mocker = "%s"',
      this.name,
      mocker,
    )

    if (this[MOCKER]) {
      throw new Error('mocker can not be set twice')
    }
    this[MOCKER] = mocker
  }

  /**
   * @ignore
   */
  public static get mocker (): Mocker {
    if (this[MOCKER]) {
      return this[MOCKER]
    }

    throw new Error([
      'static mocker not found for ',
      this.name,
      ', ',
      'please see issue #1217: https://github.com/wechaty/wechaty/issues/1217',
    ].join(''))
  }

  /**
   *
   * 2. Instance Properties & Methods
   *
   */

  /**
   * @ignore
   *
   * Instance mocker
   *
   */
  public get mocker (): Mocker {
    return instanceToClass(this, AccessoryMock).mocker
  }

  constructor (
    name?: string,
  ) {
    super()

    this.#name    = name || this.toString()
    this.#counter = COUNTER++

    log.silly('MockAccessory', '#%d<%s> constructor(%s)',
      this.#name,
      this.#counter,
      name || '',
    )
  }

}

export { AccessoryMock }
