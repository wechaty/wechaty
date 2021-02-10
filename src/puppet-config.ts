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
   * The following puppets were DEPRECATED before 2020
   */
  // 'wechaty-puppet-ioscat'    : '^0.5.22',   // https://www.npmjs.com/package/wechaty-puppet-ioscat
  // 'wechaty-puppet-padchat'   : '^0.19.3',   // https://www.npmjs.com/package/wechaty-puppet-padchat
  // 'wechaty-puppet-padpro'    : '^0.3.21',   // https://www.npmjs.com/package/wechaty-puppet-padpro

  /**
   * Deprecated on Dec 2020
   *  https://github.com/wechaty/puppet-service-providers/issues/11
   */
  // 'wechaty-puppet-padplus'   : '^0.7.30',   // https://www.npmjs.com/package/wechaty-puppet-padplus

  /**
   * Deprecated on Jan 2021: rename to wechaty-puppet-service
   *  https://github.com/wechaty/wechaty-puppet-service/issues/118
   *
   * TODO: Huan(202101): will be removed after Dec 31, 2021
   */
  'wechaty-puppet-hostie'    : '*',   // https://www.npmjs.com/package/wechaty-puppet-hostie

  /**
   * Wechaty Internal Puppets: dependency by package.json
   */
  'wechaty-puppet-service'   : '*',   // https://www.npmjs.com/package/wechaty-puppet-service
  'wechaty-puppet-mock'      : '*',   // https://www.npmjs.com/package/wechaty-puppet-mock

  /**
   * Wechaty External Puppets
   */
  'wechaty-puppet-puppeteer'        : '*',   // https://www.npmjs.com/package/wechaty-puppet-puppeteer
  'wechaty-puppet-wechat4u'         : '*',   // https://www.npmjs.com/package/wechaty-puppet-wechat4u
  'wechaty-puppet-padlocal'         : '*',   // https://www.npmjs.com/package/wechaty-puppet-padlocal

  'wechaty-puppet-gitter'           : '*',   // https://www.npmjs.com/package/wechaty-puppet-gitter
  'wechaty-puppet-lark'             : '*',   // https://www.npmjs.com/package/wechaty-puppet-lark
  'wechaty-puppet-official-account' : '*',   // https://www.npmjs.com/package/wechaty-puppet-official-account
  'wechaty-puppet-whatsapp'         : '*',   // https://www.npmjs.com/package/wechaty-puppet-whatsapp

  /**
   * Scoped puppets
   */
  '@juzibot/wechaty-puppet-donut': '^0.3', // https://www.npmjs.com/package/wechaty-puppet-donut (to be published)
  '@juzibot/wechaty-puppet-wxwork': '*',   // https://www.npmjs.com/package/wechaty-puppet-wxwork (to be published)
}

export type PuppetModuleName = keyof typeof PUPPET_DEPENDENCIES

// Huan(202001): we change default puppet from puppet-puppeteer -> puppet-service
export const PUPPET_NAME_DEFAULT: PuppetModuleName = 'wechaty-puppet-service'
