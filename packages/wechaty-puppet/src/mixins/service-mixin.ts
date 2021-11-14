import {
  serviceCtlMixin,
}                   from 'state-switch'

import {
  log,
}           from '../config.js'

import type { PuppetSkeleton } from '../puppet/puppet-skeleton.js'
import { WatchdogAgent }      from '../agents/watchdog-agent.js'

const serviceMixin = <MixinBase extends typeof PuppetSkeleton>(mixinBase: MixinBase) => {

  const serviceBase = serviceCtlMixin('PuppetServiceMixin', { log })(mixinBase)

  let PUPPET_COUNTER = 0

  abstract class ServiceMixin extends serviceBase {

    readonly _counter  : number
    readonly _watchdog : WatchdogAgent

    constructor (...args: any[]) {
      super(...args)

      this._counter = PUPPET_COUNTER++
      log.verbose('PuppetServiceMixin', 'constructor() #%s', this._counter)

      this._watchdog = new WatchdogAgent(this)
    }

    override async start (): Promise<void> {
      log.verbose('PuppetServiceMixin', 'start()')
      await super.start()
      this._watchdog.start()
    }

    override async stop (): Promise<void> {
      log.verbose('PuppetServiceMixin', 'stop()')
      this._watchdog.stop()
      await super.stop()
    }

  }

  return ServiceMixin
}

type ServiceMixin = ReturnType<typeof serviceMixin>

type ProtectedPropertyServiceMixin =
  | '_counter'
  | '_watchdog'
  | '_serviceCtlResettingIndicator'
  | '_serviceCtlLogger'

export type {
  ProtectedPropertyServiceMixin,
  ServiceMixin,
}
export { serviceMixin }
