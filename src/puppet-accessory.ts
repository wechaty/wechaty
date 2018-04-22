import { EventEmitter } from 'events'

import { log }      from './config'
import { Puppet }   from './puppet'

export abstract class PuppetAccessory extends EventEmitter {
  /**
   * 1. Static puppet property
   */
  private static _puppet?: Puppet
  public static set puppet(puppet: Puppet) {
    log.verbose('PuppetAssessory', 'static set puppet()')
    this._puppet = puppet
  }
  public static get puppet(): Puppet {
    log.silly('PuppetAssessory', 'static get puppet()')

    if (this._puppet) {
      log.silly('PuppetAssessory', 'static get puppet() from instance properties')
      return this._puppet
    }

    throw new Error('static puppet not found')
  }

  /**
   * 2. Instance puppet property
   */
  private _puppet?: Puppet

  public set puppet(puppet: Puppet) {
    log.verbose('PuppetAssessory', 'set puppet()')
    this._puppet = puppet
  }
  public get puppet(): Puppet {
    log.silly('PuppetAssessory', 'get puppet()')

    if (this._puppet) {
      log.silly('PuppetAssessory', 'get puppet() from instance properties')
      return this._puppet
    }

    return (this.constructor as any).puppet
  }

}

export default PuppetAccessory
