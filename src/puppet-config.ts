/* eslint-disable sort-keys */
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
export const PUPPET_DEPENDENCIES = {
  /**
   * The following puppets were DEPRECATED
   */
  // 'wechaty-puppet-ioscat'    : '^0.5.22',   // https://www.npmjs.com/package/wechaty-puppet-ioscat
  // 'wechaty-puppet-padchat'   : '^0.19.3',   // https://www.npmjs.com/package/wechaty-puppet-padchat
  // 'wechaty-puppet-padpro'    : '^0.3.21',   // https://www.npmjs.com/package/wechaty-puppet-padpro

  /**
   * Scoped puppets
   */
  '@juzibot/wechaty-puppet-donut': '^0.3', // https://www.npmjs.com/package/wechaty-puppet-donut (to be published)
  '@juzibot/wechaty-puppet-wxwork': '*', // https://www.npmjs.com/package/wechaty-puppet-wxwork (to be published)

  /**
   * Wechaty Internal Puppets: dependence by package.json
   */
  'wechaty-puppet-hostie'    : '*',   // https://www.npmjs.com/package/wechaty-puppet-hostie
  'wechaty-puppet-mock'      : '*',   // https://www.npmjs.com/package/wechaty-puppet-mock

  /**
   * Wechaty External Puppets
   */
  'wechaty-puppet-padplus'          : '^0.7.30',   // https://www.npmjs.com/package/wechaty-puppet-padplus
  'wechaty-puppet-puppeteer'        : '^0.23.1',   // https://www.npmjs.com/package/wechaty-puppet-puppeteer
  'wechaty-puppet-wechat4u'         : '^0.17.4',   // https://www.npmjs.com/package/wechaty-puppet-wechat4u

  /**
   * Other
   */
  'wechaty-puppet-gitter' : '^0.3.1',               // https://www.npmjs.com/package/wechaty-puppet-gitter
  'wechaty-puppet-official-account' : '^0.2.2',     // https://www.npmjs.com/package/wechaty-puppet-official-account
}

export type PuppetModuleName = keyof typeof PUPPET_DEPENDENCIES

export const PUPPET_NAME_DEFAULT: PuppetModuleName = 'wechaty-puppet-puppeteer'
