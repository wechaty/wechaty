import { EventEmitter }     from 'events'

import { instanceToClass }  from 'clone-class'

import { log }  from './config'

import { Puppet } from './puppet/'

// use Symbol to prevent conflicting with the child class properties
// This symbol must be exported (for now).
// See: https://github.com/Microsoft/TypeScript/issues/20080
export const SYMBOL_NAME    = Symbol('name')
export const SYMBOL_COUNTER = Symbol('counter')

let COUNTER = 0

export abstract class PuppetAccessory extends EventEmitter {
  // Not work???
  // private static readonly PUPPET_ACCESSORY_NAME = Symbol('name')

  private [SYMBOL_NAME]    : string
  private [SYMBOL_COUNTER] : number

  /**
   *
   * 1. Static Properties & Methods
   *
   */
  private static _puppet?: Puppet

  public static set puppet(puppet: Puppet) {
    log.silly('PuppetAccessory', '<%s> static set puppet(%s)',
                                  this.name,
                                  puppet,
              )
    this._puppet = puppet
  }

  public static get puppet(): Puppet {
    log.silly('PuppetAccessory', '<%s> static get puppet()',
                                  this.name,
              )

    if (this._puppet) {
      return this._puppet
    }

    throw new Error('static puppet not found for '
                      + this.name,
                    )
  }

  /**
   *
   * 2. Instance Properties & Methods
   *
   */
  private _puppet?: Puppet

  public set puppet(puppet: Puppet) {
    log.silly('PuppetAccessory', '<%s> set puppet(%s)',
                                  this[SYMBOL_NAME] || this,
                                  puppet,
              )
    this._puppet = puppet
  }

  public get puppet(): Puppet {
    log.silly('PuppetAccessory', '#%d<%s> get puppet()',
                                  this[SYMBOL_COUNTER],
                                  this[SYMBOL_NAME] || this,
              )

    if (this._puppet) {
      return this._puppet
    }

    /**
     * Get `puppet` from Class Static puppet property
     * note: use `instanceToClass` at here is because
     *    we might have many copy/child of `PuppetAccessory` Classes
     */
    return instanceToClass(this, PuppetAccessory).puppet
  }

  constructor(
    name?: string,
  ) {
    super()

    this[SYMBOL_NAME]    = name || this.toString()
    this[SYMBOL_COUNTER] = COUNTER++

    log.silly('PuppetAccessory', '#%d<%s> constructor(%s)',
                                    this[SYMBOL_COUNTER],
                                    this[SYMBOL_NAME],
                                    name || '',
                )
  }

}

export default PuppetAccessory
