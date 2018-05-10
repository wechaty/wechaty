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
  ContactPayload,
  ContactQueryFilter,
}                       from './contact'
import FriendRequest    from './friend-request'
import Message          from './message'

import {
  Room,
  RoomPayload,
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

export type PuppetContact        = typeof Contact       & Constructor<Contact>
export type PuppetFriendRequest  = typeof FriendRequest & Constructor<FriendRequest>
export type PuppetMessage        = typeof Message       & Constructor<Message>
export type PuppetRoom           = typeof Room          & Constructor<Room>

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
  public readonly state   : StateSwitch
  public readonly classes : PuppetClasses

  protected readonly watchdog: Watchdog

  /**
   * childPkg stores the `package.json` that the NPM module who extends the `Puppet`
   */
  private readonly childPkg: normalize.Package

  constructor(
    public options:   PuppetOptions,
    classes?:         PuppetClasses,
  ) {
    super()

    const WATCHDOG_TIMEOUT = 1 * 60 * 1000  // default 1 minute

    this.state    = new StateSwitch(this.constructor.name, log)
    this.watchdog = new Watchdog(WATCHDOG_TIMEOUT, 'Puppet')

    /**
     * 1. Check Classes for inherience correctly
     */
    if (!classes) {
      throw new Error('no classes found')
    }

    // https://stackoverflow.com/questions/14486110/how-to-check-if-a-javascript-class-inherits-another-without-creating-an-obj
    const check = classes.Contact.prototype        instanceof Contact
                && classes.FriendRequest.prototype instanceof FriendRequest
                && classes.Message.prototype       instanceof Message
                && classes.Room.prototype          instanceof Room

    if (!check) {
      throw new Error('Puppet must set classes right! https://github.com/Chatie/wechaty/issues/1167')
    }
    this.classes = classes

    /**
     * 2. Load the package.json for Puppet Plugin version range matching
     *
     * For: dist/src/puppet/puppet.ts
     *  We need to up 3 times: ../../../package.json
     */
    try {
      const childClassPath = callerResolve('.', __filename)
      this.childPkg = readPkgUp.sync({ cwd: childClassPath }).pkg
    } finally {
      if (!this.childPkg) {
        throw new Error('Cannot found package.json for Puppet Plugin Module')
      }
    }
    normalize(this.childPkg)
  }

  public emit(event: 'error',       e: Error)                                                      : boolean
  public emit(event: 'friend',      request: FriendRequest)                                       : boolean
  public emit(event: 'heartbeat',   data: any)                                                     : boolean
  public emit(event: 'login',       user: Contact)                                                 : boolean
  public emit(event: 'logout',      user: Contact | string)                                        : boolean
  public emit(event: 'message',     message: Message)                                              : boolean
  public emit(event: 'room-join',   room: Room, inviteeList: Contact[],  inviter: Contact)         : boolean
  public emit(event: 'room-leave',  room: Room, leaverList: Contact[])                             : boolean
  public emit(event: 'room-topic',  room: Room, topic: string, oldTopic: string, changer: Contact) : boolean
  public emit(event: 'scan',        url: string, code: number)                                     : boolean
  public emit(event: 'watchdog',    food: WatchdogFood)                                            : boolean
  public emit(event: never, ...args: never[])                                                      : never

  public emit(
    event:   PuppetEventName,
    ...args: any[]
  ): boolean {
    return super.emit(event, ...args)
  }

  public on(event: 'error',       listener: (e: Error) => void)                                                      : this
  public on(event: 'friend',      listener: (request: FriendRequest) => void)                      : this
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
    return this.childPkg.version
  }

  /**
   * will be used by semver.satisfied(version, range)
   */
  public wechatyVersionRange(strict = false): string {
    // FIXME: for development, we use `*` if not set
    if (strict) {
      return '^0.16.0'
    }

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
  public abstract async forward(message: Message, to: Contact | Room) : Promise<void>
  // TODO: change Message to File
  public abstract async say(textOrMessage: string | Message)          : Promise<void>
  public abstract async send(message: Message)                        : Promise<void>

  /**
   * Login / Logout
   */
  public abstract logonoff()   : boolean
  // public abstract login(user: Contact): Promise<void>
  public abstract async logout(): Promise<void>

  /**
   *
   * Misc
   *
   */
  public abstract async ding(data?: any) : Promise<string>

  /**
   *
   * FriendRequest
   *
   */
  public abstract async friendRequestSend(contact: Contact, hello?: string)   : Promise<void>
  public abstract async friendRequestAccept(contact: Contact, ticket: string) : Promise<void>

  /**
   *
   * Room
   *
   */
  public abstract async roomAdd(room: Room, contact: Contact)               : Promise<void>
  public abstract async roomCreate(contactList: Contact[], topic?: string)  : Promise<Room>
  public abstract async roomDel(room: Room, contact: Contact)               : Promise<void>
  public abstract async roomFindAll(query?: RoomQueryFilter)                : Promise<Room[]>
  public abstract async roomPayload(room: Room)                             : Promise<RoomPayload>
  public abstract async roomQuit(room: Room)                                : Promise<void>
  public abstract async roomTopic(room: Room, topic?: string)               : Promise<string | void>

  /**
   *
   * Contact
   *
   */
  public abstract async contactAlias(contact: Contact)                      : Promise<string>
  public abstract async contactAlias(contact: Contact, alias: string | null): Promise<void>
  public abstract async contactAlias(contact: Contact, alias?: string|null) : Promise<string | void>

  // TODO: change the return type from NodeJS.ReadableStream to File(vinyl)
  public abstract async contactAvatar(contact: Contact)                     : Promise<NodeJS.ReadableStream>
  public abstract async contactPayload(contact: Contact)                    : Promise<ContactPayload>

  public abstract async contactFindAll(query?: ContactQueryFilter)          : Promise<Contact[]>
}

// export class WechatError extends Error {
//   public code: WechatErrorCode
// }

export default Puppet
