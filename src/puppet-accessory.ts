
import { log }      from './config'
import { Puppet }   from './puppet'

export abstract class PuppetAccessory {
  public static puppet?: Puppet

  private _puppet?: Puppet

  public set puppet(puppet: Puppet) {
    log.verbose('PuppetAssessory', 'set puppet()')
    this._puppet = puppet
  }
  public get puppet() {
    log.silly('PuppetAssessory', 'get puppet()')

    if (this._puppet) {
      log.silly('PuppetAssessory', 'get puppet() from instance properties')
      return this._puppet
    }

    const staticPuppet = (this.constructor as any).puppet
    if (staticPuppet) {
      log.silly('PuppetAssessory', 'get puppet() from static properties')
      return staticPuppet
    }

    throw new Error('puppet not found')
  }

}

export default PuppetAccessory
