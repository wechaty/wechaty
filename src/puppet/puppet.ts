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
  FileBox,
}                       from 'file-box'
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
// import {
//   Constructor,
// }                       from 'clone-class'

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
}                       from '../contact'
import {
  FriendRequest,
}                       from '../friend-request'
import {
  Message,
  MessagePayload,
}                       from '../message'
import {
  Room,
  RoomPayload,
  RoomQueryFilter,
}                       from '../room'

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

export interface PuppetOptions {
  profile: Profile,
  wechaty: Wechaty,
}

let PUPPET_COUNTER = 0

/**
 * Abstract Puppet Class
 */
export abstract class Puppet extends EventEmitter implements Sayable {
  public readonly state   : StateSwitch
  // public readonly classes : PuppetClasses

  protected readonly watchdog: Watchdog

  protected userId?: string

  /* tslint:disable:variable-name */
  public readonly Contact       : typeof Contact
  /* tslint:disable:variable-name */
  public readonly FriendRequest : typeof FriendRequest
  /* tslint:disable:variable-name */
  public readonly Message       : typeof Message
  /* tslint:disable:variable-name */
  public readonly Room          : typeof Room

  public counter: number

  /**
   * childPkg stores the `package.json` that the NPM module who extends the `Puppet`
   */
  private readonly childPkg: normalize.Package

  constructor(
    public options: PuppetOptions,
  ) {
    super()

    this.counter = PUPPET_COUNTER++

    const WATCHDOG_TIMEOUT = 1 * 60 * 1000  // default 1 minute

    this.state    = new StateSwitch(this.constructor.name, log)
    this.watchdog = new Watchdog(WATCHDOG_TIMEOUT, 'Puppet')

    /**
     * 1. Init Classes
     */
    if (  !this.options.wechaty.Contact
        || !this.options.wechaty.FriendRequest
        || !this.options.wechaty.Message
        || !this.options.wechaty.Room
    ) {
      throw new Error('wechaty classes are not inited')
    }

    this.Contact       = this.options.wechaty.Contact
    this.FriendRequest = this.options.wechaty.FriendRequest
    this.Message       = this.options.wechaty.Message
    this.Room          = this.options.wechaty.Room

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

  public toString() {
    return `Puppet#${this.counter}<${this.constructor.name}>(${this.options.profile.name})`
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

  public userSelf(): Contact {
    log.verbose('Puppet', 'self()')

    if (!this.userId) {
      throw new Error('not logged in, no userSelf yet.')
    }

    const user = this.Contact.load(this.userId)
    return user
  }

  public async say(textOrFile: string | FileBox) : Promise<void> {
    if (!this.logonoff()) {
      throw new Error('can not say before login')
    }

    let msg: Message

    if (typeof textOrFile === 'string') {
      msg = this.Message.createMO({
        text : textOrFile,
        to   : this.userSelf(),
      })
    } else if (textOrFile instanceof FileBox) {
      msg = this.Message.createMO({
        file: textOrFile,
        to: this.userSelf(),
      })
    } else {
      throw new Error('say() arg unknown')
    }

    await this.messageSend(msg)
  }

  /**
   * Login / Logout
   */
  public logonoff(): boolean {
    if (this.userId) {
      return true
    } else {
      return false
    }
  }

  // public abstract login(user: Contact): Promise<void>
  public abstract async logout(): Promise<void>

  /**
   *
   * Message
   *
   */
  public abstract async messageForward(message: Message, to: Contact | Room) : Promise<void>
  public abstract async messageSend(message: Message)                        : Promise<void>

  public abstract async messageRawPayload(id: string)            : Promise<any>
  public abstract async messageRawPayloadParser(rawPayload: any) : Promise<MessagePayload>

  public async messagePayload(id: string): Promise<MessagePayload> {
    log.verbose('Puppet', 'messagePayload(%s)', id)
    const rawPayload = await this.messageRawPayload(id)
    const payload    = await this.messageRawPayloadParser(rawPayload)

    console.log('this.messageRawPayloadParser().payload.from.puppet = ', payload.from!.puppet + '')
    /**
     * Make sure all the contacts & room have already been ready
     */
    if (payload.from && !payload.from.isReady()) {
      await payload.from.ready()
    }
    if (payload.to && !payload.to.isReady()) {
      await payload.to.ready()
    }

    if (payload.room && !payload.room.isReady()) {
      await payload.room.ready()
    }

    return payload
  }

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
  public abstract async roomAdd(room: Room, contact: Contact)              : Promise<void>
  public abstract async roomCreate(contactList: Contact[], topic?: string) : Promise<Room>
  public abstract async roomDel(room: Room, contact: Contact)              : Promise<void>
  public abstract async roomFindAll(query?: RoomQueryFilter)               : Promise<Room[]>
  public abstract async roomQuit(room: Room)                               : Promise<void>
  public abstract async roomTopic(room: Room, topic?: string)              : Promise<string | void>

  public abstract async roomRawPayload(id: string)            : Promise<any>
  public abstract async roomRawPayloadParser(rawPayload: any) : Promise<RoomPayload>

  public async roomPayload(id: string): Promise<RoomPayload> {
    log.verbose('Puppet', 'roomPayload(%s)', id)
    const rawPayload = await this.roomRawPayload(id)
    const payload    = await this.roomRawPayloadParser(rawPayload)
    return payload
  }

  /**
   *
   * Contact
   *
   */
  public abstract async contactAlias(contact: Contact)                       : Promise<string>
  public abstract async contactAlias(contact: Contact, alias: string | null) : Promise<void>
  public abstract async contactAlias(contact: Contact, alias?: string|null)  : Promise<string | void>
  public abstract async contactAvatar(contact: Contact)                      : Promise<FileBox>
  public abstract async contactFindAll(query?: ContactQueryFilter)           : Promise<Contact[]>

  public abstract async contactRawPayload(id: string)            : Promise<any>
  public abstract async contactRawPayloadParser(rawPayload: any) : Promise<ContactPayload>

  public async contactPayload(id: string): Promise<ContactPayload> {
    log.verbose('Puppet', 'contactPayload(%s) @ %s', id, this)
    const rawPayload = await this.contactRawPayload(id)
    const payload    = await this.contactRawPayloadParser(rawPayload)
    return payload
  }

  /**
   *
   * Misc
   *
   */
  public abstract async ding(data?: any) : Promise<string>

}

// export class WechatError extends Error {
//   public code: WechatErrorCode
// }

export default Puppet
