import PuppetPuppeteer  from './puppet-puppeteer/'
import PuppetMock       from './puppet-mock/'

/**
 * would be nice if we have a typing from package.json schema
 *
 * https://github.com/DefinitelyTyped/DefinitelyTyped/issues/15602
 * https://github.com/Microsoft/TypeScript/issues/3136
 */

/**
 * Puppet Official Plugins List
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
