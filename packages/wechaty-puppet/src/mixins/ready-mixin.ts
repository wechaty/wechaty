import { BooleanIndicator } from 'state-switch'

import {
  log,
} from '../config.js'

import type { PuppetSkeleton } from '../puppet/puppet-skeleton.js'

const readyMixin = <MixinBase extends typeof PuppetSkeleton>(mixinBase: MixinBase) => {

  abstract class ReadyMixin extends mixinBase {

    readyIndicator: BooleanIndicator

    constructor (...args: any[]) {
      super(...args)
      log.verbose('ReadyMixin', 'constructor()')

      this.readyIndicator = new BooleanIndicator()
    }

    override async start (): Promise<void> {
      log.verbose('ReadyMixin', 'start()')
      await super.start()

      this.on('ready', () => {
        this.readyIndicator.value(true)
      })

      this.on('logout', () => {
        this.readyIndicator.value(false)
      })
      this.on('reset', () => {
        this.readyIndicator.value(false)
      })

    }

    override async stop (): Promise<void> {
      log.verbose('ReadyMixin', 'stop()')
      this.readyIndicator.value(false)

      /**
       * Huan(202201) NOTE: super.stop() should be the last line of this method
       *  becasue we should keep the reverse order of logic in start()
       */
      await super.stop()
    }

  }

  return ReadyMixin
}

type ReadyMixin = ReturnType<typeof readyMixin>

export type {
  ReadyMixin,
}
export { readyMixin }
