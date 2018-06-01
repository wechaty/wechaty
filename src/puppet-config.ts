import { PuppetPuppeteer }  from './puppet-puppeteer/'
import { PuppetMock }       from './puppet-mock/'
// import { PuppetPadchat }    from './puppet-padchat'
import PuppetWechat4u   from './puppet-wechat4u/'

/**
 * Wechaty Official Puppet Plugins List
 */
export const PUPPET_DICT = {
  mock:       PuppetMock,
  puppeteer:  PuppetPuppeteer,
  // padchat:    PuppetPadchat,
  wechat4u:   PuppetWechat4u,
}

export type PuppetName =  keyof typeof PUPPET_DICT

//   'android-pad'
// | 'android-phone'
// | 'cat-king'
// | 'hostie'
// | 'ios-app-phone'
// | 'ios-app-pad'
// | 'mock'
// | 'web'
// | 'win32'
