/**
 * Wechat for Bot. and for human who can talk with bot/robot
 *
 * Interface for Puppet
 *
 * Class Puppet
 *
 * Licenst: ISC
 * https://github.com/wechaty/wechaty
 *
 */

import { EventEmitter } from 'events'

import Contact  from './contact'
import Message  from './message'
import Room     from './room'
import log      from './brolog-env'

// type ContactGetterFunc = {
//   (id: string): Promise<any>
// }

abstract class Puppet extends EventEmitter {
  public user: Contact
  public abstract getContact(id: string): Promise<any>

  protected userId: string

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
  public targetState(newState?) {
    if (newState) {
      log.verbose('Puppet', 'targetState(%s)', newState)
      this._targetState = newState
    }
    return this._targetState
  }

  // currentState : 'birthing' | 'killing'
  public currentState(newState?) {
    if (newState) {
      log.verbose('Puppet', 'currentState(%s)', newState)
      this._currentState = newState
    }
    return this._currentState
  }

  public abstract self(message?: Message): boolean | Contact

  // public user(contact?: Contact) {
  //   if (contact) {
  //     this._user = contact
  //   }
  //   return this._user
  // }

  public abstract send(message: Message): Promise<any>
  public abstract reply(message: Message, reply): Promise<any>

  public abstract reset(reason?: string)
  public abstract logout(): Promise<any>
  public abstract quit(): Promise<any>
  public abstract ding(data?: string): Promise<any>

  public abstract friendRequestSend(contact: Contact, hello?: string): Promise<any>
  public abstract friendRequestAccept(contact: Contact, ticket: string): Promise<any>

  public abstract roomAdd(room: Room, contact: Contact): Promise<number>
  public abstract roomDel(room: Room, contact: Contact): Promise<number>
  public abstract roomTopic(room: Room, topic: string): Promise<string>
  public abstract roomCreate(contactList: Contact[], topic?: string): Promise<Room>
  public abstract roomFind(filter: Function): Promise<Room[]>

  public abstract contactFind(filter: Function): Promise<Contact[]>
}

export default Puppet
export {
    Contact
  , Message
  , Puppet
  , Room
}
