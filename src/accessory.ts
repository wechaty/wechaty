import { EventEmitter }     from 'events'

import { instanceToClass }  from 'clone-class'
import { Puppet }           from 'wechaty-puppet'

import { log }      from './config'
import { Wechaty }  from './wechaty'

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

  /**
   * @ignore
   */
  public static set puppet (puppet: Puppet) {
    log.silly('Accessory', '<%s> static set puppet = "%s"',
      this.name,
      puppet,
    )

    if (this._puppet) {
      throw new Error('puppet can not be set twice')
    }
    this._puppet = puppet
  }

  /**
   * @ignore
   */
  public static get puppet (): Puppet {
    // log.silly('Accessory', '<%s> static get puppet()',
    //                               this.name,
    //           )

    if (this._puppet) {
      return this._puppet
    }

    throw new Error([
      'static puppet not found for ',
      this.name,
      ', ',
      'please see issue #1217: https://github.com/wechaty/wechaty/issues/1217',
    ].join(''))
  }

  /**
   * @ignore
   */
  public static set wechaty (wechaty: Wechaty) {
    log.silly('Accessory', '<%s> static set wechaty = "%s"',
      this.name,
      wechaty,
    )
    if (this._wechaty) {
      throw new Error('wechaty can not be set twice')
    }
    this._wechaty = wechaty
  }

  /**
   * @ignore
   */
  public static get wechaty (): Wechaty {
    // log.silly('Accessory', '<%s> static get wechaty()',
    //                               this.name,
    //           )

    if (this._wechaty) {
      return this._wechaty
    }

    throw new Error('static wechaty not found for ' + this.name)
  }

  /**
   *
   * 2. Instance Properties & Methods
   *
   * The ability of set different `puppet` to the instance is required.
   * For example: the Wechaty instances have to have different `puppet`.
   */
  private _puppet?  : Puppet

  /**
   * @ignore
   */
  public set puppet (puppet: Puppet) {
    log.silly('Accessory', '<%s> set puppet = "%s"',
      this[SYMBOL_NAME] || this,
      puppet,
    )
    if (this._puppet) {
      throw new Error('puppet can not be set twice')
    }
    this._puppet = puppet
  }

  /**
   * @ignore
   *
   * instance.puppet
   *
   * Needs to support different `puppet` between instances.
   *
   * For example: every Wechaty instance needs its own `puppet`
   *
   * So: that's the reason that there's no `private _wechaty: Wechaty` for the instance.
   *
   */
  public get puppet (): Puppet {
    // log.silly('Accessory', '#%d<%s> get puppet()',
    //                               this[SYMBOL_COUNTER],
    //                               this[SYMBOL_NAME] || this,
    //           )

    if (this._puppet) {
      return this._puppet
    }

    /**
     * Get `puppet` from Class Static puppet property
     * note: use `instanceToClass` at here is because
     *    we might have many copy/child of `Accessory` Classes
     */
    return instanceToClass(this, Accessory).puppet
  }

  /**
   * @ignore
   *
   * instance.wechaty is for:
   *  Contact.wechaty
   *  FriendRequest.wechaty
   *  Message.wechaty
   *  Room.wechaty
   *
   * So it only need one `wechaty` for all the instances
   */
  public get wechaty (): Wechaty {
    // log.silly('Accessory', '#%d<%s> get wechaty()',
    //                               this[SYMBOL_COUNTER],
    //                               this[SYMBOL_NAME] || this,
    //           )

    /**
     * Get `wechaty` from Class Static puppet property
     * note: use `instanceToClass` at here is because
     *    we might have many copy/child of `Accessory` Classes
     */
    return instanceToClass(this, Accessory).wechaty
  }

  constructor (
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
