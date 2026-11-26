/**
 * Service mixin: start and stop for the puppet (from `state-switch`'s
 * `serviceCtlMixin`), plus the `WatchdogAgent` that resets a stalled puppet.
 */
import {
  serviceCtlMixin,
}                   from 'state-switch'

import {
  log,
}           from '../config.ts'

import type { PuppetSkeleton } from '../puppet/puppet-skeleton.ts'
import { WatchdogAgent }      from '../agents/watchdog-agent.ts'
import { WechatyEvent }       from '../events/event-target.ts'

const serviceMixin = <MixinBase extends typeof PuppetSkeleton>(mixinBase: MixinBase) => {

  const serviceBase = serviceCtlMixin('PuppetServiceMixin', { log })(mixinBase)

  let PUPPET_COUNTER = 0

  abstract class ServiceMixin extends serviceBase {

    readonly __counter  : number
    readonly __watchdog : WatchdogAgent

    constructor (...args: any[]) {
      super(...args)

      this.__counter = PUPPET_COUNTER++
      log.verbose('PuppetServiceMixin', 'constructor() #%s', this.__counter)

      this.__watchdog = new WatchdogAgent(this)
    }

    override async start (): Promise<void> {
      log.verbose('PuppetServiceMixin', 'start()')
      await super.start()
      this.__watchdog.start()
      this.dispatchEvent(new WechatyEvent('start'))
    }

    override async stop (): Promise<void> {
      log.verbose('PuppetServiceMixin', 'stop()')
      this.__watchdog.stop()
      await super.stop()
      this.dispatchEvent(new WechatyEvent('stop'))
    }

  }

  return ServiceMixin
}

type ServiceMixin = ReturnType<typeof serviceMixin>

type ProtectedPropertyServiceMixin =
  | '__counter'
  | '__watchdog'
  | '__serviceCtlResettingIndicator'
  | '__serviceCtlLogger'

export type {
  ProtectedPropertyServiceMixin,
  ServiceMixin,
}
export { serviceMixin }
