import { EventEmitter }     from 'events'

import { instanceToClass }  from 'clone-class'

import { log }  from './config'

import { Puppet } from './abstract-puppet/'

export const NAME = Symbol('name')

export abstract class PuppetAccessory extends EventEmitter {

  /**
   * 1. Static puppet property
   */
  private static _puppet?: Puppet

  public static set puppet(puppet: Puppet) {
    log.silly('PuppetAccessory', '<%s> static set puppet(%s)', this[NAME], puppet.constructor.name)
    this._puppet = puppet
  }

  public static get puppet(): Puppet {
    log.silly('PuppetAccessory', '<%s> static get puppet()', this[NAME])

    if (this._puppet) {
      return this._puppet
    }

    throw new Error('static puppet not found')
  }

  /**
   * 2. constructor
   */
  private [NAME]: string

  constructor(
    name?: string,
  ) {
    super()
    this[NAME] = name || this.constructor.name
  }

  /**
   * 3. Instance puppet property
   */
  private _puppet?: Puppet

  public set puppet(puppet: Puppet) {
    log.silly('PuppetAccessory', '<%s> set puppet(%s)', this[NAME], puppet.constructor.name)
    this._puppet = puppet
  }

  public get puppet(): Puppet {
    log.silly('PuppetAccessory', '<%s> get puppet()', this[NAME])

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
}

export default PuppetAccessory
