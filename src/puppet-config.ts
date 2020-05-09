/**
 * Wechaty Official Puppet Implementations List
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

  /**
   * Wechaty Internal Puppets: dependenced by package.json
   */
  'wechaty-puppet-hostie'    : '^0.7.9',   // https://www.npmjs.com/package/wechaty-puppet-hostie
  'wechaty-puppet-mock'      : '^0.21.2',   // https://www.npmjs.com/package/wechaty-puppet-mock

  /**
   * Wechaty External Puppets
   */
  'wechaty-puppet-padplus'   : '^0.7.15',    // https://www.npmjs.com/package/wechaty-puppet-padplus
  'wechaty-puppet-puppeteer' : '^0.21.2',   // https://www.npmjs.com/package/wechaty-puppet-puppeteer
  'wechaty-puppet-wechat4u'  : '^0.17.4',   // https://www.npmjs.com/package/wechaty-puppet-wechat4u
}

export type PuppetModuleName = keyof typeof PUPPET_DEPENDENCIES

export const PUPPET_NAME_DEFAULT: PuppetModuleName = 'wechaty-puppet-puppeteer'
