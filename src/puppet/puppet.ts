/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2018 Huan LI <zixia@zixia.net>
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */
import { EventEmitter } from 'events'

import * as normalize   from 'normalize-package-data'
import * as readPkgUp   from 'read-pkg-up'

import {
  callerResolve,
}                       from 'hot-import'
import {
  StateSwitch,
}                       from 'state-switch'
import {
  Watchdog,
  WatchdogFood,
}                       from 'watchdog'
import {
  Constructor,
}                       from 'clone-class'

import {
  WECHATY_EVENT_DICT,
  Wechaty,
}                       from '../wechaty'
import {
  Sayable,
  log,
}                       from '../config'
import Profile          from '../profile'

import {
  Contact,
  ContactQueryFilter,
}                       from './contact'
import FriendRequest    from './friend-request'
import Message          from './message'

import {
  Room,
  RoomQueryFilter,
}                       from './room'

// XXX: Name??? ScanInfo? ScanEvent? ScanXXX?
export interface ScanData {
  avatar: string, // Image Data URL
  url:    string, // QR Code URL
  code:   number, // Code
}

export const PUPPET_EVENT_DICT = {
  ...WECHATY_EVENT_DICT,
  watchdog: 'tbw',
}

export type PuppetEventName = keyof typeof PUPPET_EVENT_DICT

export type PuppetContact        = typeof Contact        & Constructor<Contact>
export type PuppetFriendRequest  = typeof FriendRequest  & Constructor<FriendRequest>
export type PuppetMessage        = typeof Message        & Constructor<Message>
export type PuppetRoom           = typeof Room           & Constructor<Room>

export interface PuppetClasses {
  Contact:        PuppetContact,
  FriendRequest:  PuppetFriendRequest,
  Message:        PuppetMessage,
  Room:           PuppetRoom,
}

export interface PuppetOptions {
  profile: Profile,
  wechaty: Wechaty,
}

/**
 * Abstract Puppet Class
 */
export abstract class Puppet extends EventEmitter implements Sayable {
  public readonly state: StateSwitch

  protected readonly watchdog: Watchdog

  private readonly pkg: normalize.Package

  constructor(
    public options: PuppetOptions,
    public classes: PuppetClasses,
  ) {
    super()

    const WATCHDOG_TIMEOUT = 1 * 60 * 1000  // default 1 minute

    this.state    = new StateSwitch(this.constructor.name, log)
    this.watchdog = new Watchdog(WATCHDOG_TIMEOUT, 'Puppet')

    /**
     * 1. Check Classes for inherience correctly
     */
    // https://stackoverflow.com/questions/14486110/how-to-check-if-a-javascript-class-inherits-another-without-creating-an-obj
    const check = classes.Contact.prototype        instanceof Contact
                && classes.FriendRequest.prototype instanceof FriendRequest
                && classes.Message.prototype       instanceof Message
                && classes.Room.prototype          instanceof Room

    if (!check) {
      throw new Error('Puppet must set classes right! https://github.com/Chatie/wechaty/issues/1167')
    }

    /**
     * 2. Load the package.json for Puppet Plugin version range matching
     *
     * For: dist/src/puppet/puppet.ts
     *  We need to up 3 times: ../../../package.json
     */
    try {
      const childClassPath = callerResolve('.', __filename)
      this.pkg = readPkgUp.sync({ cwd: childClassPath }).pkg
    } finally {
      if (!this.pkg) {
        throw new Error('Cannot found package.json for Puppet Plugin Module')
      }
    }
    normalize(this.pkg)
  }

  public emit(event: 'error',       e: Error)                                                      : boolean
  public emit(event: 'friend',      friend: Contact, request?: FriendRequest)                      : boolean
  public emit(event: 'heartbeat',   data: any)                                                     : boolean
  public emit(event: 'login',       user: Contact)                                                 : boolean
  public emit(event: 'logout',      user: Contact | string)                                        : boolean
  public emit(event: 'message',     message: Message)                                              : boolean
  public emit(event: 'room-join',   room: Room, inviteeList: Contact[],  inviter: Contact)         : boolean
  public emit(event: 'room-leave',  room: Room, leaverList: Contact[])                             : boolean
  public emit(event: 'room-topic',  room: Room, topic: string, oldTopic: string, changer: Contact) : boolean
  public emit(event: 'scan',        url: string, code: number)                                     : boolean
  public emit(event: 'watchdog',    food: WatchdogFood)                                            : boolean
  public emit(event: never, ...args: never[]): never

  public emit(
    event:   PuppetEventName,
    ...args: any[]
  ): boolean {
    return super.emit(event, ...args)
  }

  public on(event: 'error',       listener: (e: Error) => void)                                                      : this
  public on(event: 'friend',      listener: (friend: Contact, request?: FriendRequest) => void)                      : this
  public on(event: 'heartbeat',   listener: (data: any) => void)                                                     : this
  public on(event: 'login',       listener: (user: Contact) => void)                                                 : this
  public on(event: 'logout',      listener: (user: Contact) => void)                                                 : this
  public on(event: 'message',     listener: (message: Message) => void)                                              : this
  public on(event: 'room-join',   listener: (room: Room, inviteeList: Contact[],  inviter: Contact) => void)         : this
  public on(event: 'room-leave',  listener: (room: Room, leaverList: Contact[]) => void)                             : this
  public on(event: 'room-topic',  listener: (room: Room, topic: string, oldTopic: string, changer: Contact) => void) : this
  public on(event: 'scan',        listener: (info: ScanData) => void)                                                : this
  public on(event: 'watchdog',    listener: (data: WatchdogFood) => void)                                            : this
  public on(event: never,         listener: never)                                                                   : never

  public on(
    event:    PuppetEventName,
    listener: (...args: any[]) => void,
  ): this {
    super.on(event, listener)
    return this
  }

  public version(): string {
    return this.pkg.version
  }

  /**
   * will be used by semver.satisfied(version, range)
   */
  public wechatyVersionRange(): string {
    // FIXME: for development, we use `*` if not set
    return '*'

    // TODO: test and uncomment the following codes after promote the `wehcaty-puppet` as a solo NPM module

    // if (this.pkg.dependencies && this.pkg.dependencies.wechaty) {
    //   throw new Error('Wechaty Puppet Implementation should add `wechaty` from `dependencies` to `peerDependencies` in package.json')
    // }

    // if (!this.pkg.peerDependencies || !this.pkg.peerDependencies.wechaty) {
    //   throw new Error('Wechaty Puppet Implementation should add `wechaty` to `peerDependencies`')
    // }

    // if (!this.pkg.engines || !this.pkg.engines.wechaty) {
    //   throw new Error('Wechaty Puppet Implementation must define `package.engines.wechaty` for a required Version Range')
    // }

    // return this.pkg.engines.wechaty
  }

  public abstract async start() : Promise<void>
  public abstract async stop()  : Promise<void>

  public abstract userSelf(): Contact

  /**
   * Message
   */
  public abstract forward(message: Message, contact: Contact | Room) : Promise<void>
  public abstract say(text: string)                                  : Promise<void>
  public abstract send(message: Message)                             : Promise<void>

  /**
   * Login / Logout
   */
  public abstract logonoff()          : boolean
  // public abstract login(user: Contact): Promise<void>
  public abstract logout()            : Promise<void>

  /**
   * Misc
   */
  public abstract ding(data?: any) : Promise<string>

  /**
   * FriendRequest
   */
  public abstract friendRequestSend(contact: Contact, hello?: string)   : Promise<void>
  public abstract friendRequestAccept(contact: Contact, ticket: string) : Promise<void>

  /**
   * Room
   */
  public abstract roomAdd(room: Room, contact: Contact)              : Promise<void>
  public abstract roomCreate(contactList: Contact[], topic?: string) : Promise<Room>
  public abstract roomDel(room: Room, contact: Contact)              : Promise<void>
  public abstract roomFindAll(filter: RoomQueryFilter)           : Promise<Room[]>
  public abstract roomTopic(room: Room, topic?: string)              : Promise<string | void>

  /**
   * Contact
   */
  public abstract contactAlias(contact: Contact)                      : Promise<string>
  public abstract contactAlias(contact: Contact, alias: string | null): Promise<void>
  public abstract contactAlias(contact: Contact, alias?: string|null) : Promise<string | void>

  public abstract contactFindAll(filter: ContactQueryFilter)          : Promise<Contact[]>
}

// export class WechatError extends Error {
//   public code: WechatErrorCode
// }

export default Puppet
