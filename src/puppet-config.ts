import {
  Constructor,
}                 from 'clone-class'
import npm        from 'npm-programmatic'
import pkgDir     from 'pkg-dir'
import semver     from 'semver'

import {
  Puppet,
}                 from 'wechaty-puppet'

import {
  log,
}                 from './config'

export interface PuppetConfig {
  npm: {
    name     : string,
    version? : string,
  },
}

/**
 * Wechaty Official Puppet Plugins List
 */
const mock: PuppetConfig = {
  npm: {
    name: 'wechaty-puppet-mock',
  },
}

const wechat4u: PuppetConfig = {
  npm: {
    name    : 'wechaty-puppet-wechat4u',
    version : '^0.2.21',
  },
}

const padchat: PuppetConfig = {
  npm: {
    name    : 'wechaty-puppet-padchat',
    version : '^0.4.4',
  },
}

const puppeteer: PuppetConfig = {
  npm: {
    name: 'wechaty-puppet-puppeteer',
    version: '^0.4.2',
  },
}
export const PUPPET_DICT = {
  default: puppeteer,
  //////////////////////////
  mock,
  padchat,
  puppeteer,
  wechat4u,
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

export async function puppetResolver (puppet: PuppetName): Promise<typeof Puppet & Constructor<Puppet>> {
  log.verbose('PuppetConfig', 'puppetResolver(%s)', puppet)

  validatePuppetConfig()

  const puppetConfig = PUPPET_DICT[puppet]
  if (!puppetConfig) {
    throw new Error('no such puppet: ' + puppet)
  }

  // tslint:disable-next-line:variable-name
  let puppetModule

  try {
    puppetModule = await import(puppetConfig.npm.name)
  } catch (e) {
    log.silly('PuppetConfig', 'puppetResolver(%s) exception: %s', puppet, e.message)

    try {
      await installPuppet(
        puppetConfig.npm.name,
        puppetConfig.npm.version,
      )
      puppetModule = await import(puppetConfig.npm.name)
    } catch (e) {
      log.error('PupptConfig', 'puppetResolver(%s) install fail: %s', puppet, e.message)
      throw e
    }
  }

  log.silly('PuppetConfig', 'puppetResolver(%s) import success.', puppet)

  return puppetModule.default as typeof Puppet & Constructor<typeof Puppet>
}

async function installPuppet (
  puppetNpm: string,
  puppetVersion = 'latest',
): Promise<void> {
  log.info('PuppetConfig', 'installPuppet(%s@%s) please wait ...', puppetNpm, puppetVersion)
  await npm.install(
    `${puppetNpm}@${puppetVersion}`,
    {
      cwd    : await pkgDir(__dirname),
      output : true,
      save   : false,
    },
  )
  log.info('PuppetConfig', 'installPuppet(%s) done', puppetNpm)
}

function validatePuppetConfig () {
  let puppetName: PuppetName
  for (puppetName in PUPPET_DICT) {
    const puppetConfig = PUPPET_DICT[puppetName]
    const version = puppetConfig.npm.version

    if (!version || !semver.valid(version)) {
      throw new Error(`puppet config version ${version} not valid for ${puppetName}`)
    }
  }
}
