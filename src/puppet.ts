/**
 * Wechat for Bot. and for human who can talk with bot/robot
 *
 * Interface for puppet
 *
 * Class Puppet
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */

import { EventEmitter } from 'events'

import Contact  from './contact'
import Message  from './message'
import Room     from './room'
import log      from './brolog-env'

class Puppet extends EventEmitter {
  private _user: Contact

  private _targetState:   string
  private _currentState:  string

  constructor() {
    super()

    /*
     * @deprecated
     * connected / disconnected
     * connecting / disconnecting
     */
    // this._readyState = 'disconnected'

    this.targetState('dead')
    this.currentState('dead')
  }

  // targetState : 'live' | 'dead'
  public targetState(newState) {
    if (newState) {
      log.verbose('Puppet', 'targetState(%s)', newState)
      this._targetState = newState
    }
    return this._targetState
  }

  // currentState : 'birthing' | 'killing'
  public currentState(newState) {
    if (newState) {
      log.verbose('Puppet', 'currentState(%s)', newState)
      this._currentState = newState
    }
    return this._currentState
  }

  public self(message?: Message): boolean | Contact {
    throw new Error('pure virtual interface function')
  }

  public user(contact?: Contact) {
    if (contact) {
      this._user = contact
    }
    return this._user
  }

  /**
   * let puppet send message
   *
   * @param <Message> message - the message to be sent
   * @return <Promise>
   */
  public send(message): Promise<any>  { throw new Error('To Be Implemented') }
  public reply(message, reply): Promise<any> { throw new Error('To Be Implemented') }

  public reset(reason?: string)  { throw new Error('To Be Implementsd') }
  public logout(): Promise<any>  { throw new Error('To Be Implementsd') }
  public quit(): Promise<any>  { throw new Error('To Be Implementsd') }
  public ding(data?: string): Promise<any>        { throw new Error('To Be Implementsd') }

  public getContact(id): Promise<any>  { // for unit testing
    log.verbose('Puppet', `Interface method getContact(${id})`)
    throw new Error('Absolute Interface Method should never to be called')
    // return Promise.resolve({UserName: 'WeChaty', NickName: 'Puppet'})
  }

  // () { throw new Error('To Be Implemented')  }
}

// Object.assign(Puppet, {
//   Message:    require('./message')
//   , Contact:  require('./contact')
//   , Room:     require('./room')
// })

// module.exports = Puppet
export default Puppet
export {
    Contact
  , Message
  , Puppet
  , Room
}
