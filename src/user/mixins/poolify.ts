/**
 * Class mixins are a pattern for sharing code between classes using standard JavaScript.
 * https://lit.dev/docs/composition/mixins/
 */
import type { Constructor } from 'clone-class'
import { log } from 'wechaty-puppet'

const POOL = Symbol('pool')

interface PoolifyMixin<T> {
  new (...args: any[]): T
  pool: Map<string, T>
}

const poolifyMixin = <T, TBase extends Constructor<{}>> (base: TBase) => {
  log.verbose('user/mixins/poolify', 'poolifyMixin(%s)', base.name)

  class PoolifiedMixin extends base {

    static [POOL]?: Map<string, T>
    static get pool (): Map<string, T> {
      /**
       * hasOwnProperty() is important because we will have child classes
       */
      if (!Object.prototype.hasOwnProperty.call(this, POOL)) {
        log.verbose('Room', 'pool() init pool')
        this[POOL] = new Map<string, T>()
      }

      return this[POOL]!  // FIXME: why we need "!" at here?
    }

    public static load<L extends (Function & PoolifyMixin<InstanceType<L>> & { prototype: any })> (
      this : L,
      id   : string,
    ): L['prototype'] {
      const existingItem = this.pool.get(id)
      if (existingItem) {
        return existingItem
      }

      const newItem = new this(id)
      this.pool.set(id, newItem)

      return newItem
    }

    constructor (...args: any[]) {
      super(...args)
    }

  }

  return PoolifiedMixin
}

export type {
  PoolifyMixin,
}
export {
  POOL,
  poolifyMixin,
}
