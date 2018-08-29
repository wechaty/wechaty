/**
 * Wechaty Official Puppet Implementations List
 */
export const PUPPET_DEPENDENCIES = {
  'default'                  : '0.0.0',    // will be replaced with PUPPET_DEFAULT
  'padchat'                  : '0.0.0',    // compatible with v0.18, will be replaced with wechaty-puppet-padchat
  /////////////////////////////////////
  // 'wechaty-puppet-hostie'    : '^0.0.1',
  'wechaty-puppet-ioscat'    : '^0.5.16',
  'wechaty-puppet-mock'      : '^0.14.1',
  'wechaty-puppet-padchat'   : '^0.16.1',
  'wechaty-puppet-puppeteer' : '^0.14.1',
  'wechaty-puppet-wechat4u'  : '^0.14.1',
}

export const PUPPET_DEFAULT = 'wechaty-puppet-puppeteer'

export type PuppetModuleName = keyof typeof PUPPET_DEPENDENCIES
