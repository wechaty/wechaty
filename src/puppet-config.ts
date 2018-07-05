import {
  Constructor,
}                 from 'clone-class'
import npm        from 'npm-programmatic'

import {
  Puppet,
}                 from 'wechaty-puppet'

export interface PuppetConfig {
  npm: string,
}

/**
 * Wechaty Official Puppet Plugins List
 */
const mock: PuppetConfig = {
  npm: 'wechaty-puppet-mock',
}

const wechat4u: PuppetConfig = {
  npm: 'wechaty-puppet-wechat4u',
}

const padchat: PuppetConfig = {
  npm: 'wechaty-puppet-padchat',
}

export const PUPPET_DICT = {
  default: wechat4u,
  //////////////////////////
  mock,
  padchat,
  wechat4u,
  // puppeteer:  PuppetPuppeteer,
}

export type PuppetName = keyof typeof PUPPET_DICT

//   'android-pad'
// | 'android-phone'
// | 'cat-king'
// | 'hostie'
// | 'ios-app-phone'
// | 'ios-app-pad'
// | 'mock'
// | 'web'
// | 'win32'

export async function puppetResolver (puppet: PuppetName): Promise<typeof Puppet & Constructor<typeof Puppet>> {
  const config = PUPPET_DICT[puppet]
  if (!config) {
    throw new Error('no such puppet: ' + puppet)
  }

  // tslint:disable-next-line:variable-name
  let MyPuppet: typeof Puppet & Constructor<typeof Puppet>

  try {
    MyPuppet = await import(config.npm)
  } catch (e) {
    await npm.install(config.npm)
    MyPuppet = await import(config.npm)
  }

  return MyPuppet
}
