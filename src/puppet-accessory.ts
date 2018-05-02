import { EventEmitter }     from 'events'

import { instanceToClass }  from 'clone-class'

import { log }  from './config'

import { Puppet } from './puppet/'

// use Symbol to prevent conflicting with the child class properties
export const PUPPET_ACCESSORY_NAME = Symbol('name')

export abstract class PuppetAccessory extends EventEmitter {
  // Not work???
  // private static readonly PUPPET_ACCESSORY_NAME = Symbol('name')

  private static  [PUPPET_ACCESSORY_NAME]: string
  private         [PUPPET_ACCESSORY_NAME]: string

  /**
   * 1. Static Property & Methods
   */
  private static _puppet?: Puppet

  public static set puppet(puppet: Puppet) {
    log.silly('PuppetAccessory', '<%s> static set puppet(%s)',
                                  this[PUPPET_ACCESSORY_NAME] || this.name,
                                  puppet.constructor.name,
              )
    this._puppet = puppet
  }

  public static get puppet(): Puppet {
    log.silly('PuppetAccessory', '<%s> static get puppet()',
                                  this[PUPPET_ACCESSORY_NAME] || this.name,
              )

    if (this._puppet) {
      return this._puppet
    }

    throw new Error('static puppet not found')
  }

  /**
   * 2. Instance Properties & Methods
   */
  private _puppet?: Puppet

  public set puppet(puppet: Puppet) {
    log.silly('PuppetAccessory', '<%s> set puppet(%s)',
                                  this[PUPPET_ACCESSORY_NAME],
                                  puppet.constructor.name,
              )
    this._puppet = puppet
  }

  public get puppet(): Puppet {
    log.silly('PuppetAccessory', '<%s> get puppet()',
                                  this[PUPPET_ACCESSORY_NAME],
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

    this[PUPPET_ACCESSORY_NAME] = name || this.constructor.name

    log.verbose('PuppetAccessory', '<%s> constructor(%s)',
                                    this[PUPPET_ACCESSORY_NAME],
                                    name,
                )
  }

}

export default PuppetAccessory
