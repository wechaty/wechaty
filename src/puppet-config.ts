// import { PuppetMock }       from 'wechaty-puppet-mock'
import { PuppetWechat4u }   from 'wechaty-puppet-wechat4u'

import { PuppetPuppeteer }  from './puppet-puppeteer/'
import { PuppetPadchat }    from './puppet-padchat'

/**
 * Wechaty Official Puppet Plugins List
 */
export const PUPPET_DICT = {
  default:    PuppetWechat4u,
  //////////////////////////
  // mock:       PuppetMock,
  padchat:    PuppetPadchat,
  puppeteer:  PuppetPuppeteer,
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
