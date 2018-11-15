/**
 * Wechaty Official Puppet Implementations List
 */
export const PUPPET_DEPENDENCIES = {
  'default'                  : '0.0.0',    // will be replaced with PUPPET_DEFAULT
  'mock'                     : '0.0.0',    // compatible with v0.18, will be replaced with wechaty-puppet-padchat
  'padchat'                  : '0.0.0',    // compatible with v0.18, will be replaced with wechaty-puppet-padchat
  'padpro'                   : '0.0.0',
  /////////////////////////////////////
  // 'wechaty-puppet-hostie'    : '^0.0.1',
  'wechaty-puppet-ioscat'    : '^0.5.19',
  'wechaty-puppet-mock'      : '^0.14.1',
  'wechaty-puppet-padchat'   : '^0.18.1',
  'wechaty-puppet-padpro'    : '^0.0.1',
  'wechaty-puppet-puppeteer' : '^0.14.1',
  'wechaty-puppet-wechat4u'  : '^0.14.1',
}

export type PuppetModuleName = keyof typeof PUPPET_DEPENDENCIES

export const PUPPET_NAME_DEFAULT: PuppetModuleName = 'wechaty-puppet-puppeteer'
