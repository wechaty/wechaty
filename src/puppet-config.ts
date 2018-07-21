import clearModule  from 'clear-module'
import {
  Constructor,
}                   from 'clone-class'
import npm          from 'npm-programmatic'
import pkgDir       from 'pkg-dir'
import semver       from 'semver'

import {
  Puppet,
}                 from 'wechaty-puppet'

import {
  log,
}                 from './config'

export interface PuppetConfig {
  npm: {
    name    : string,
    version : string,
  },
}

/**
 * Wechaty Official Puppet Plugins List
 */
const mock: PuppetConfig = {
  npm: {
    name: 'wechaty-puppet-mock',
    version: '^0.8.2',
  },
}

const wechat4u: PuppetConfig = {
  npm: {
    name    : 'wechaty-puppet-wechat4u',
    version : '^0.8.3',
  },
}

const padchat: PuppetConfig = {
  npm: {
    name    : 'wechaty-puppet-padchat',
    version : '^0.8.1',
  },
}

const puppeteer: PuppetConfig = {
  npm: {
    name: 'wechaty-puppet-puppeteer',
    version: '^0.8.2',
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

export async function puppetResolver (puppet: PuppetName): Promise<typeof Puppet & Constructor<Puppet>> {
  log.verbose('PuppetConfig', 'puppetResolver(%s)', puppet)

  validatePuppetConfig()

  const puppetConfig = PUPPET_DICT[puppet]
  if (!puppetConfig) {
    throw new Error('no such puppet: ' + puppet)
  }

  // tslint:disable-next-line:variable-name
  let puppetModule: {
    VERSION: string,
    default: typeof Puppet,
  }

  try {
    puppetModule = await import(puppetConfig.npm.name)

    const version = puppetModule.VERSION

    if (semver.satisfies(
      version,
      puppetConfig.npm.version,
    )) {
      log.silly('PuppetConfig', 'puppetResolver() installed version %s satisfies required version %s for %s',
                                version,
                                puppetConfig.npm.version,
                                puppetConfig.npm.name,
                )
    } else {
      clearModule(puppetConfig.npm.name)
      throw new Error(`installed puppet version ${puppetModule.VERSION} is not satisfies config version ${puppetConfig.npm.version}`)
    }

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
  for (puppetName of Object.keys(PUPPET_DICT) as PuppetName[]) {
    const puppetConfig = PUPPET_DICT[puppetName]
    const version = puppetConfig.npm.version || '*'

    if (!version || !semver.validRange(version)) {
      throw new Error(`puppet config version ${version} not valid for ${puppetName}`)
    }
  }
}
