import { EventEmitter } from 'events'

import {
  Sayable,
}                       from './config'
import { Contact }      from './contact'
import { Message }      from './message'
import { StateMonitor } from './state-monitor'
import { Room }         from './room'

// type ContactGetterFunc = {
//   (id: string): Promise<any>
// }

/**
 * Abstract Puppet Class
 */
export abstract class Puppet extends EventEmitter implements Sayable {
  public userId:  string  | null
  public user:    Contact | null
  public abstract getContact(id: string): Promise<any>

  public state = new StateMonitor<'live', 'dead'>('Puppet', 'dead')

  constructor() {
    super()
  }

  public abstract async init(): Promise<void>

  public abstract self(): Contact

  public abstract getBaseRequest(): Promise<any>
  public abstract sendMedia(message: Message): Promise<void>
  public abstract send(message: Message): Promise<void>
  public abstract say(content: string): Promise<void>

  public abstract reset(reason?: string): void
  public abstract logout(): Promise<void>
  public abstract quit(): Promise<void>

  public abstract ding(): Promise<string>

  /**
   * FriendRequest
   */
  public abstract friendRequestSend(contact: Contact, hello?: string): Promise<any>
  public abstract friendRequestAccept(contact: Contact, ticket: string): Promise<any>

  /**
   * Room
   */
  public abstract roomAdd(room: Room, contact: Contact): Promise<number>
  public abstract roomDel(room: Room, contact: Contact): Promise<number>
  public abstract roomTopic(room: Room, topic: string): Promise<string>
  public abstract roomCreate(contactList: Contact[], topic?: string): Promise<Room>
  public abstract roomFind(filterFunc: string): Promise<Room[]>

  /**
   * Contact
   */
  public abstract contactFind(filterFunc: string): Promise<Contact[]>
  public abstract contactAlias(contact: Contact, alias: string|null): Promise<boolean>
}
