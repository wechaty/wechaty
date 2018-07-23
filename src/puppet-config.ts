/**
 * Wechaty Official Puppet Implementations List
 */
export const PUPPET_DEPENDENCIES = {
  'default'                  : '0.0.0',    // will be replaced with PUPPET_DEFAULT
  'padchat'                  : '0.0.0',    // compatible with v0.18, will be replaced with wechaty-puppet-padchat
  /////////////////////////////////////
  'wechaty-puppet-mock'      : '^0.8.2',
  'wechaty-puppet-padchat'   : '^0.8.1',
  'wechaty-puppet-puppeteer' : '^0.8.2',
  'wechaty-puppet-wechat4u'  : '^0.8.3',
}

export const PUPPET_DEFAULT = 'wechaty-puppet-puppeteer'

export type PuppetName = keyof typeof PUPPET_DEPENDENCIES
