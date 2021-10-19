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
declare module 'qrcode-terminal'

/**
 * Should be removed after Nov 16
 * @see https://github.com/huan/clone-class/issues/58
 */
declare module 'clone-class' {
  export { instanceToClass } from 'clone-class'
  type ClassInterface<C> = {
    [key in keyof C]: C[key];
  }

  type InstanceInterface <I> = {
    new (...args: any[]): I
    prototype: I
  }

  export type Constructor<
    I extends {} = {},
    C = any
  > = InstanceInterface<I> & ClassInterface<C>
}
