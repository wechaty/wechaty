import type { MemoryCard }  from 'memory-card'

import type {
  PuppetSkelton,
}                   from '../puppet/skelton.js'

import {
  log,
}           from '../config.js'

const memoryMixin = <MixinBase extends typeof PuppetSkelton>(mixinBase: MixinBase) => {

  abstract class MemoryMixin extends mixinBase {

    #memory?: MemoryCard

    get memory (): MemoryCard {
      if (this.#memory) {
        return this.#memory
      }
      throw new Error('NOMEMORY')
    }

    set memory (memory: MemoryCard) {
      log.verbose('PuppetMemoryMixin', 'set memory(%s)', memory.name)

      if (this.#memory) {
        throw new Error('HASMEMORY')
      }
      this.#memory = memory
    }

    constructor (...args: any[]) {
      super(...args)
      log.verbose('PuppetMemoryMixin', 'constructor()')
    }

    override async start (): Promise<void> {
      log.verbose('PuppetMemoryMixin', 'constructor()')
      await this.memory.load()
      await super.start()
    }

    override async stop (): Promise<void> {
      log.verbose('PuppetMemoryMixin', 'constructor()')
      await super.stop()
    }

  }

  return MemoryMixin
}

export { memoryMixin }
