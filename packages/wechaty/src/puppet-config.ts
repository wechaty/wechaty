/**
 * The puppet providers Wechaty knows by npm name (the names
 * `wechaty gateway` accepts), with the version ranges `bin/puppet-install.ts`
 * installs in the Docker image, and the message for starting without a
 * puppet. Wechaty 2.0 has no default puppet
 * (wechaty/wechaty#3054): a bot names one in its options or in
 * `WECHATY_PUPPET`.
 */
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
   * Wechaty internal puppets: workspace packages of this monorepo, which
   * wechaty's package.json depends on. Their ranges must match package.json
   * (`puppet-config.test.ts` checks it); `bin/puppet-install.ts` skips them,
   * as `npm ci` already installs them.
   */
  'wechaty-puppet-service' : '^2.0.0-alpha.20',  // packages/wechaty-puppet-service
  'wechaty-puppet-mock'    : '^2.0.0-alpha.20',  // packages/wechaty-puppet-mock

  /**
   * External puppets, installed in the Docker image by `bin/puppet-install.ts`.
   * 2.0 lists only providers known to load with wechaty-puppet 2.0: today
   * wechaty-puppet-neo, whose peer dependency still names wechaty-puppet
   * 1.20.2 (see the installer). The 1.x providers (wechat4u, padlocal, xp,
   * whatsapp, ...) and the deprecated ones are gone (wechaty/wechaty#3054).
   * Providers reached over gRPC still work through `wechaty-puppet-service`.
   */
  'wechaty-puppet-neo' : '^0.1.1',  // https://www.npmjs.com/package/wechaty-puppet-neo
}

type OfficialPuppetNpmName = keyof typeof OFFICIAL_PUPPET_DEPENDENCIES

const isPuppetModuleName = (name: string): name is OfficialPuppetNpmName => name in OFFICIAL_PUPPET_DEPENDENCIES

/**
 * Why a bot cannot start without a puppet, and how to name one. Wechaty 1.x
 * fell back to a default puppet (`wechaty-puppet-wechat4u` last); 2.0 has
 * none, so the choice is always explicit.
 */
const NO_PUPPET_MESSAGE = [
  'No puppet is set: Wechaty 2.0 has no default puppet. Name one of:',
  '  - in code:  WechatyBuilder.build({ puppet: \'wechaty-puppet-service\', puppetOptions: { token } })',
  '  - or in the environment:  WECHATY_PUPPET=wechaty-puppet-service',
  'Puppet providers: https://wechaty.js.org/docs/puppet-providers/',
].join('\n')

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
  NO_PUPPET_MESSAGE,
  isPuppetModuleName,
}
