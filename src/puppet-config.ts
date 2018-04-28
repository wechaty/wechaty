import PuppetPuppeteer  from './puppet-puppeteer/'
import PuppetMock       from './puppet-mock/'

/**
 * Wechaty Official Puppet Plugins List
 */
export const PUPPET_DICT = {
  mock:       PuppetMock,
  puppeteer:  PuppetPuppeteer,
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
