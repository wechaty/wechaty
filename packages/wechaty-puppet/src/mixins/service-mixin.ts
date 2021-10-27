import {
  serviceCtlMixin,
}                   from 'state-switch'

import {
  log,
}           from '../config.js'

import type { PuppetSkelton } from '../puppet/puppet-skelton.js'
import { WatchdogAgent }      from '../agents/watchdog-agent.js'

const serviceMixin = <MixinBase extends typeof PuppetSkelton>(mixinBase: MixinBase) => {

  const serviceBase = serviceCtlMixin('PuppetServiceMixin', { log })(mixinBase)

  let PUPPET_COUNTER = 0

  abstract class ServiceMixin extends serviceBase {

    readonly counter  : number
    readonly watchdog : WatchdogAgent

    constructor (...args: any[]) {
      super(...args)

      this.counter = PUPPET_COUNTER++
      log.verbose('PuppetServiceMixin', 'constructor() #%s', this.counter)

      this.watchdog = new WatchdogAgent(this)
    }

    override async start (): Promise<void> {
      log.verbose('PuppetServiceMixin', 'start()')
      await super.start()
      this.watchdog.start()
    }

    override async stop (): Promise<void> {
      log.verbose('PuppetServiceMixin', 'stop()')
      this.watchdog.stop()
      await super.stop()
    }

  }

  return ServiceMixin
}

type ServiceMixin = ReturnType<typeof serviceMixin>

type ProtectedPropertyServiceMixin =
  | 'counter'

export type {
  ProtectedPropertyServiceMixin,
  ServiceMixin,
}
export { serviceMixin }
