/**
 * Wechaty Official Puppet Implementations List
 */
export const PUPPET_DEPENDENCIES = {
  'default'                  : '0.0.0',    // will be replaced with PUPPET_DEFAULT
  'padchat'                  : '0.0.0',    // compatible with v0.18, will be replaced with wechaty-puppet-padchat
  /////////////////////////////////////
  'wechaty-puppet-ioscat'    : '^0.4.12',
  'wechaty-puppet-mock'      : '^0.8.2',
  'wechaty-puppet-padchat'   : '^0.9.29',
  'wechaty-puppet-puppeteer' : '^0.9.2',
  'wechaty-puppet-wechat4u'  : '^0.9.4',
}

export const PUPPET_DEFAULT = 'wechaty-puppet-puppeteer'

export type PuppetModuleName = keyof typeof PUPPET_DEPENDENCIES
