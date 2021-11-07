import { MemoryCard }  from 'memory-card'

import type {
  PuppetSkeleton,
}                   from '../puppet/puppet-skeleton.js'

import {
  log,
}           from '../config.js'

const memoryMixin = <MixinBase extends typeof PuppetSkeleton>(mixinBase: MixinBase) => {

  abstract class MemoryMixin extends mixinBase {

    _memory: MemoryCard

    get memory (): MemoryCard {
      return this._memory
    }

    constructor (...args: any[]) {
      super(...args)
      log.verbose('PuppetMemoryMixin', 'constructor()')
      /**
       * Huan(202110): we init a un-named MemoryCard by default
       *  it can be replaced by `setMemory()` later.
       */
      this._memory = new MemoryCard()
    }

    override async start (): Promise<void> {
      log.verbose('PuppetMemoryMixin', 'start()')
      try {
        await this.memory.load()
      } catch (_) {
        log.silly('PuppetMemoryMixin', 'start() memory has already been loaded before')
      }
      await super.start()
    }

    override async stop (): Promise<void> {
      log.verbose('PuppetMemoryMixin', 'stop()')
      await super.stop()
    }

    setMemory (memory: MemoryCard): void {
      log.verbose('PuppetMemoryMixin', 'setMemory(%s)', memory.name)

      if (this._memory.name) {
        throw new Error('Puppet memory can be only set once')
      }
      this._memory = memory
    }

  }

  return MemoryMixin
}

type MemoryMixin = ReturnType<typeof memoryMixin>

type ProtectedPropertyMemoryMixin =
  | '_memory'
  | 'memory'

export type {
  MemoryMixin,
  ProtectedPropertyMemoryMixin,
}
export { memoryMixin }
