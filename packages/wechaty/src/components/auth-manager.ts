/**
 * Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 * @copyright 2016 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Authentication and current-user state manager for Wechaty bot instances.
 *
 * Why this module exists:
 * Encapsulates bot authentication queries (`currentUser`, `isLoggedIn`, `authQrCode`, `logout()`),
 * decoupling them from the legacy `loginMixin` and providing clean delegates.
 *
 * Architectural boundaries:
 * Owned by `Wechaty`. Internal to `packages/wechaty/src/components/`.
 */
import { log } from 'wechaty-puppet'
import type { ContactSelf, ContactSelfImpl } from '../user-modules/mod.ts'
import type { PuppetManager } from './puppet-manager.ts'
import type { Wechaty } from '../wechaty/wechaty.ts'

export class AuthManager {

  readonly #wechaty: Wechaty
  readonly #puppetManager: PuppetManager

  constructor (wechaty: Wechaty, puppetManager: PuppetManager) {
    this.#wechaty = wechaty
    this.#puppetManager = puppetManager
  }

  get authQrCode (): undefined | string {
    return this.#puppetManager.puppet.authQrCode
  }

  get currentUser (): ContactSelf {
    return (this.#wechaty.ContactSelf as typeof ContactSelfImpl)
      .load(this.#puppetManager.puppet.currentUserId)
  }

  get isLoggedIn (): boolean {
    try {
      return this.#puppetManager.puppet.isLoggedIn
    } catch (e) {
      this.#wechaty.emitError(e)
      log.warn('AuthManager', 'get isLoggedIn puppet instance is not ready yet')
      return false
    }
  }

  async logout (): Promise<void> {
    await this.#puppetManager.puppet.logout()
  }

}
