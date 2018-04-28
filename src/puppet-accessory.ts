import { EventEmitter }     from 'events'

import { instanceToClass }  from 'clone-class'

import { log }  from './config'

import { Puppet } from './abstract-puppet/'

export abstract class PuppetAccessory extends EventEmitter {

  /**
   * 1. Static puppet property
   */
  private static _puppet?: Puppet

  public static set puppet(puppet: Puppet) {
    log.silly('PuppetAssessory', 'static set puppet(%s)', puppet.constructor.name)
    this._puppet = puppet
  }

  public static get puppet(): Puppet {
    log.silly('PuppetAssessory', 'static get puppet()')

    if (this._puppet) {
      return this._puppet
    }

    throw new Error('static puppet not found')
  }

  /**
   * 2. Instance puppet property
   */
  private _puppet?: Puppet

  public set puppet(puppet: Puppet) {
    log.silly('PuppetAssessory', 'set puppet(%s)', puppet.constructor.name)
    this._puppet = puppet
  }

  public get puppet(): Puppet {
    log.silly('PuppetAssessory', 'get puppet() from instance')

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
