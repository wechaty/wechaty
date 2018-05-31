import { EventEmitter }     from 'events'

import { instanceToClass }  from 'clone-class'

import { log }  from './config'

import { Wechaty } from './wechaty'
import { Puppet } from './puppet/'

// use Symbol to prevent conflicting with the child class properties
// This symbol must be exported (for now).
// See: https://github.com/Microsoft/TypeScript/issues/20080
export const SYMBOL_NAME    = Symbol('name')
export const SYMBOL_COUNTER = Symbol('counter')

let COUNTER = 0

export abstract class Accessory extends EventEmitter {
  // Not work???
  // private static readonly PUPPET_ACCESSORY_NAME = Symbol('name')

  private [SYMBOL_NAME]    : string
  private [SYMBOL_COUNTER] : number

  /**
   *
   * 1. Static Properties & Methods
   *
   */
  private static _puppet?  : Puppet
  private static _wechaty? : Wechaty

  public static set puppet(puppet: Puppet) {
    log.silly('Accessory', '<%s> static set puppet(%s)',
                                  this.name,
                                  puppet,
              )

    if (this._puppet) {
      throw new Error('puppet can not be set twice')
    }
    this._puppet = puppet
  }

  public static get puppet(): Puppet {
    log.silly('Accessory', '<%s> static get puppet()',
                                  this.name,
              )

    if (this._puppet) {
      return this._puppet
    }

    throw new Error('static puppet not found for '
                      + this.name,
                    )
  }

  public static set wechaty(wechaty: Wechaty) {
    log.silly('Accessory', '<%s> static set wechaty(%s)',
                                  this.name,
                                  wechaty,
              )
    if (this._wechaty) {
      throw new Error('wechaty can not be set twice')
    }
    this._wechaty = wechaty
  }

  public static get wechaty(): Wechaty {
    log.silly('Accessory', '<%s> static get wechaty()',
                                  this.name,
              )

    if (this._wechaty) {
      return this._wechaty
    }

    throw new Error('static wechaty not found for '
                      + this.name,
                    )
  }

  /**
   *
   * 2. Instance Properties & Methods
   *
   */
  public set puppet(puppet: Puppet) {
    log.silly('Accessory', '<%s> set puppet(%s)',
                                  this[SYMBOL_NAME] || this,
                                  puppet,
              )
    instanceToClass(this, Accessory).puppet = puppet
  }

  public get puppet(): Puppet {
    log.silly('Accessory', '#%d<%s> get puppet()',
                                  this[SYMBOL_COUNTER],
                                  this[SYMBOL_NAME] || this,
              )

    // if (this._puppet) {
    //   return this._puppet
    // }

    /**
     * Get `puppet` from Class Static puppet property
     * note: use `instanceToClass` at here is because
     *    we might have many copy/child of `Accessory` Classes
     */
    return instanceToClass(this, Accessory).puppet
  }

  public set wechaty(wechaty: Wechaty) {
    log.silly('Accessory', '<%s> set wechaty(%s)',
                                  this[SYMBOL_NAME] || this,
                                  wechaty,
              )
    instanceToClass(this, Accessory).wechaty = wechaty
  }

  public get wechaty(): Wechaty {
    log.silly('Accessory', '#%d<%s> get wechaty()',
                                  this[SYMBOL_COUNTER],
                                  this[SYMBOL_NAME] || this,
              )

    /**
     * Get `puppet` from Class Static puppet property
     * note: use `instanceToClass` at here is because
     *    we might have many copy/child of `Accessory` Classes
     */
    return instanceToClass(this, Accessory).wechaty
  }

  constructor(
    name?: string,
  ) {
    super()

    this[SYMBOL_NAME]    = name || this.toString()
    this[SYMBOL_COUNTER] = COUNTER++

    log.silly('Accessory', '#%d<%s> constructor(%s)',
                                    this[SYMBOL_COUNTER],
                                    this[SYMBOL_NAME],
                                    name || '',
                )
  }

}

export default Accessory
