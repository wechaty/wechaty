import {
  log,
}           from '../config.js'

import type { PuppetOptions }   from '../schemas/puppet.js'
import { CacheAgent }           from '../agents/mod.js'

import type { PuppetSkelton } from '../puppet/puppet-skelton.js'

const cacheMixin = <MixinBase extends typeof PuppetSkelton>(mixinBase: MixinBase) => {

  abstract class CacheMixin extends mixinBase {

    cache: CacheAgent

    constructor (...args: any[]) {
      super(...args)
      log.verbose('PuppetCacheMixin', 'constructor(%s)',
        args[0]
          ? JSON.stringify(args[0])
          : '',
      )

      const options: PuppetOptions = args[0] || {}

      this.cache = new CacheAgent(options.cache)
    }

    override async start (): Promise<void> {
      log.verbose('PuppetCacheMixin', 'start()')
      await super.start()
      this.cache.start()
    }

    override async stop (): Promise<void> {
      log.verbose('PuppetCacheMixin', 'stop()')
      this.cache.stop()
      await super.stop()
    }

  }

  return CacheMixin
}

type CacheMixin = ReturnType<typeof cacheMixin>

type ProtectedPropertyCacheMixin =
  | 'cache'

export type {
  CacheMixin,
  ProtectedPropertyCacheMixin,
}
export { cacheMixin }
