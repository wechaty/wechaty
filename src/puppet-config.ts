/**
 * Wechaty Official Puppet Implementations List
 */
export const PUPPET_DEPENDENCIES = {
  // 'default'                  : '0.0.0',    // will be replaced with PUPPET_DEFAULT
  // 'mock'                     : '0.0.0',    // compatible with v0.18, will be replaced with wechaty-puppet-padchat
  // 'padchat'                  : '0.0.0',    // compatible with v0.18, will be replaced with wechaty-puppet-padchat
  // 'padpro'                   : '0.0.0',

  /******************************************************************************************
   * DEPRECATED by Huan(202002): The Above is Alias for the following full NPM module names *
   *******************************************************************************************/

  'wechaty-puppet-hostie'    : '^0.3.18',    // https://www.npmjs.com/package/wechaty-puppet-hostie
  'wechaty-puppet-mock'      : '^0.17.5',   // https://www.npmjs.com/package/wechaty-puppet-mock

  // 'wechaty-puppet-dll'       : '^0.3.1',    // https://www.npmjs.com/package/wechaty-puppet-dll
  // 'wechaty-puppet-ioscat'    : '^0.5.22',   // https://www.npmjs.com/package/wechaty-puppet-ioscat
  // 'wechaty-puppet-padchat'   : '^0.19.3',   // https://www.npmjs.com/package/wechaty-puppet-padchat
  'wechaty-puppet-padplus'   : '^0.5.13',    // https://www.npmjs.com/package/wechaty-puppet-padplus
  // 'wechaty-puppet-padpro'    : '^0.3.21',   // https://www.npmjs.com/package/wechaty-puppet-padpro
  'wechaty-puppet-puppeteer' : '^0.19.5',   // https://www.npmjs.com/package/wechaty-puppet-puppeteer
  'wechaty-puppet-wechat4u'  : '^0.16.3',   // https://www.npmjs.com/package/wechaty-puppet-wechat4u
}

export type PuppetModuleName = keyof typeof PUPPET_DEPENDENCIES

export const PUPPET_NAME_DEFAULT: PuppetModuleName = 'wechaty-puppet-puppeteer'
