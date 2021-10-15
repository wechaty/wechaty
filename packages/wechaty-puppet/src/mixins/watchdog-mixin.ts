import type { PuppetSkelton }   from '../puppet/skelton.js'

import {
  log,
}                   from '../config.js'
import {
  WatchdogAgent,
}                   from '../agents/mod.js'

const watchdogMixin = <MixinBase extends typeof PuppetSkelton>(mixinBase: MixinBase) => {

  abstract class WatchdogMixin extends mixinBase {

    watchdog: WatchdogAgent

    constructor (...args: any[]) {
      super(...args)
      log.verbose('PuppetWatchdogMixin', 'constructor("%s")', JSON.stringify(args))

      this.watchdog = new WatchdogAgent(this)
    }

    override async start (): Promise<void> {
      log.verbose('PuppetWatchdogMixin', 'start()')
      await super.start()
      this.watchdog.start()
    }

    override async stop (): Promise<void> {
      log.verbose('PuppetWatchdogMixin', 'stop()')
      this.watchdog.stop()
      await super.stop()
    }

  }

  return WatchdogMixin
}

type WatchdogMixin = ReturnType<typeof watchdogMixin>

export type {
  WatchdogMixin,
}
export { watchdogMixin }
