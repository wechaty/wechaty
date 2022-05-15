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
const OFFICIAL_PUPPET_DEPENDENCIES = {
  /**
   * The following puppets were DEPRECATED before 2020
   */
  // 'wechaty-puppet-ioscat'    : '^0.5.22',   // https://www.npmjs.com/package/wechaty-puppet-ioscat
  // 'wechaty-puppet-padchat'   : '^0.19.3',   // https://www.npmjs.com/package/wechaty-puppet-padchat
  // 'wechaty-puppet-padpro'    : '^0.3.21',   // https://www.npmjs.com/package/wechaty-puppet-padpro

  /**
   * Deprecated History:
   *  https://github.com/wechaty/puppet-service-providers/issues/11
   */
  // Dec 2020
  //  - https://github.com/wechaty/puppet-services/issues/61
  //    'wechaty-puppet-padplus'   : '^0.7.30',   // https://www.npmjs.com/package/wechaty-puppet-padplus
  // Sep 2021:
  //    'wechaty-puppet-hostie'    : '*',       // https://www.npmjs.com/package/wechaty-puppet-hostie

  /**
   * Wechaty Internal Puppets: dependency by package.json
   *
   *  Huan(202108): DO NOT REMOVE THE SPECIFIC VERSIONS BELOW
   *    All the internal puppets which have already depended in package.json
   *    MUST be listed below with their correct version number (ranges)
   *    because the `bin/puppet-install.ts` will use those version
   *    to install all them inside the Docker
   */
  'wechaty-puppet-service' : '>=1.19.8',  // https://www.npmjs.com/package/wechaty-puppet-service
  'wechaty-puppet-mock'    : '>=1.10.2',  // https://www.npmjs.com/package/wechaty-puppet-mock

  /**
   * WeChat Puppets
   */
  'wechaty-puppet-wechat'           : '>=1.11.8', // https://www.npmjs.com/package/wechaty-puppet-wechat
  'wechaty-puppet-wechat4u'         : '>=1.11.1', // https://www.npmjs.com/package/wechaty-puppet-wechat4u
  'wechaty-puppet-padlocal'         : '>=1.11.13',  // https://www.npmjs.com/package/wechaty-puppet-padlocal
  'wechaty-puppet-xp'               : '>=1.10.2',  // https://www.npmjs.com/package/wechaty-puppet-xp
  'wechaty-puppet-oicq'             : '>=1.10.2',  // https://www.npmjs.com/package/wechaty-puppet-oicq
  'wechaty-puppet-official-account' : '>=1.10.2',    // https://www.npmjs.com/package/wechaty-puppet-official-account

  /**
   * Non-WeChat External Puppets
   */
  'wechaty-puppet-gitter'   : '>=1.10.1',   // https://www.npmjs.com/package/wechaty-puppet-gitter
  'wechaty-puppet-lark'     : '>=0.4.5',   // https://www.npmjs.com/package/wechaty-puppet-lark
  'wechaty-puppet-whatsapp' : '>=1.10.4',   // https://www.npmjs.com/package/wechaty-puppet-whatsapp
  'wechaty-puppet-walnut'   : '>=0.1.41',  // https://www.npmjs.com/package/wechaty-puppet-walnut

  /**
   * Scoped puppets (private)
   */
  '@juzibot/wechaty-puppet-donut'  : '*',   // https://www.npmjs.com/package/wechaty-puppet-donut (to be published)
  '@juzibot/wechaty-puppet-wxwork' : '*',   // https://www.npmjs.com/package/wechaty-puppet-wxwork (to be published)
}

type OfficialPuppetNpmName = keyof typeof OFFICIAL_PUPPET_DEPENDENCIES

const isPuppetModuleName = (name: string): name is OfficialPuppetNpmName => name in OFFICIAL_PUPPET_DEPENDENCIES

/**
 * Updates:
 *  - Huan(202004): we change default puppet from puppet-service -> puppet-wechat (with UOS support)
 *  - Huan(202009): use puppet service as default
 *  - Huan(202201): use puppet-wechat4u as default
 */
const OFFICIAL_PUPPET_DEFAULT: OfficialPuppetNpmName = 'wechaty-puppet-wechat4u'

// i.e. @juzibot/wechaty-puppet-donut
type PuppetNpmScope = `@${string}/` | ''
type PuppetNpmName  = `${PuppetNpmScope}wechaty-puppet-${string}`

/**
 * @deprecated: use `OfficialPuppetNpmName` instead. will be removed after Dec 31, 2022
 */
type PuppetModuleName = OfficialPuppetNpmName

export {
  type OfficialPuppetNpmName,
  type PuppetNpmName,
  type PuppetModuleName, // DEPRECATED
  OFFICIAL_PUPPET_DEPENDENCIES,
  OFFICIAL_PUPPET_DEFAULT,
  isPuppetModuleName,
}
