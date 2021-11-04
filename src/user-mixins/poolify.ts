/**
 * Class mixins are a pattern for sharing code between classes using standard JavaScript.
 * https://lit.dev/docs/composition/mixins/
 */
import type { Constructor } from 'clone-class'
import { log } from 'wechaty-puppet'

interface PoolifyMixin<T> {
  new (...args: any[]): T
  pool: Map<string, T>
}

/**
 * https://stackoverflow.com/a/60378737/1123955
 *
 * You want something like partial type parameter inference,
 * which is not currently a feature of TypeScript (see microsoft/TypeScript#26242).
 * Right now you either have to specify all type parameters manually
 * or let the compiler infer all type parameters;
 * there's no partial inference.
 * As you've noticed,
 * generic type parameter defaults do not scratch this itch;
 * a default turns off inference.
 */
const poolifyMixin = <MixinBase extends Constructor>(mixinBase: MixinBase) => <T>() => {
  log.verbose('PoolifyMixin', 'poolifyMixin(%s)', mixinBase.name)

  abstract class AbstractPoolifyMixin extends mixinBase {

    static _pool?     : Map<string, T>
    static get pool (): Map<string, T> {
      /**
       * hasOwnProperty() is important because we are calling this from the child classes
       */
      if (!Object.prototype.hasOwnProperty.call(this, '_pool')) {
        log.verbose('PoolifyMixin', 'get pool() init pool')
        this._pool = new Map<string, T>()
      }

      return this._pool!  // FIXME: why we need "!" at here?
    }

    public static load<L extends Constructor<T> & PoolifyMixin<T>> (
      this : L,
      id   : string,
    ): T {
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

  return AbstractPoolifyMixin
}

export type {
  PoolifyMixin,
}
export {
  poolifyMixin,
}
