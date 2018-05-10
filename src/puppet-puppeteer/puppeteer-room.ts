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
 *   @ignore
 */
import * as util from 'util'

import {
  Raven,
  log,
}                       from '../config'
import Misc             from '../misc'
import {
  Room,
  RoomMemberQueryFilter,
  RoomPayload,
  // RoomQueryFilter,
}                         from '../puppet/'

// import { PuppetPuppeteer }  from './puppet-puppeteer'
import { PuppeteerMessage } from './puppeteer-message'
import { PuppeteerContact } from './puppeteer-contact'

/**
 * All wechat rooms(groups) will be encapsulated as a Room.
 *
 * `Room` is `Sayable`,
 * [Examples/Room-Bot]{@link https://github.com/Chatie/wechaty/blob/master/examples/room-bot.ts}
 */
export class PuppeteerRoom extends Room {

  // private dirtyObj: PuppeteerRoomPayload | null // when refresh, use this to save dirty data for query
  // private obj:      PuppeteerRoomPayload | null
  // private rawObj:   PuppeteerRoomRawPayload

  /**
   * @private
   */
  constructor(public id: string) {
    super(id)
    log.silly('PuppeteerRoom', `constructor(${id})`)
  }

  /**
   * @private
   */
  public isReady(): boolean {
    return !!(this.payload && this.payload.memberList && this.payload.memberList.length)
  }

  /**
   * @private
   */
  // private async readyAllMembers(memberList: PuppeteerRoomRawMember[]): Promise<void> {
  //   for (const member of memberList) {
  //     const contact = PuppeteerContact.load(member.UserName)
  //     contact.puppet = this.puppet
  //     await contact.ready()
  //   }
  //   return
  // }

  /**
   * @private
   */
  public async ready(): Promise<void> {
    log.silly('PuppeteerRoom', 'ready()')

    if (this.isReady()) {
      return
    }

    const payload = await this.puppet.roomPayload(this)
    await Promise.all(
      payload.memberList.map(
        contact => contact.ready(),
      ),
    )
    log.silly('PuppeteerRoom', 'ready() this.payload="%s"',
                                util.inspect(payload),
              )

    this.payload = payload
  }

  public say(message: PuppeteerMessage)                 : Promise<void>
  public say(text: string)                              : Promise<void>
  public say(text: string, mention: PuppeteerContact)   : Promise<void>
  public say(text: string, mention: PuppeteerContact[]) : Promise<void>

  public say(text: never, ...args: never[]): Promise<never>
  public async say(
    textOrMessage : string | PuppeteerMessage,
    mention?      : PuppeteerContact | PuppeteerContact[],
  ): Promise<void> {
    log.verbose('PuppeteerRoom', 'say(%s, %s)',
                        textOrMessage,
                        Array.isArray(mention)
                        ? mention.map(c => c.name()).join(', ')
                        : mention ? mention.name() : '',
    )

    let m
    if (typeof textOrMessage === 'string') {
      m = new PuppeteerMessage()
      m.puppet = this.puppet

      const replyToList: PuppeteerContact[] = [].concat(mention as any || [])

      if (replyToList.length > 0) {
        const AT_SEPRATOR = String.fromCharCode(8197)
        const mentionList = replyToList.map(c => '@' + c.name()).join(AT_SEPRATOR)
        m.text(mentionList + ' ' + textOrMessage)
      } else {
        m.text(textOrMessage)
      }
      // m.to(replyToList[0])
    } else
      m = textOrMessage

    m.room(this)

    await this.puppet.send(m)
  }

  public async add(contact: PuppeteerContact): Promise<void> {
    log.verbose('PuppeteerRoom', 'add(%s)', contact)

    if (!contact) {
      throw new Error('contact not found')
    }

    await this.puppet.roomAdd(this, contact)
  }

  public async del(contact: PuppeteerContact): Promise<void> {
    log.verbose('PuppeteerRoom', 'del(%s)', contact.name())

    if (!contact) {
      throw new Error('contact not found')
    }
    await this.puppet.roomDel(this, contact)
    this.delLocal(contact)
  }

  private delLocal(contact: PuppeteerContact): number {
    log.verbose('PuppeteerRoom', 'delLocal(%s)', contact)

    const memberList = this.payload && this.payload.memberList
    if (!memberList || memberList.length === 0) {
      return 0 // already in refreshing
    }

    let i
    for (i = 0; i < memberList.length; i++) {
      if (memberList[i].id === contact.id) {
        break
      }
    }
    if (i < memberList.length) {
      memberList.splice(i, 1)
      return 1
    }
    return 0
  }

  public async quit(): Promise<void> {
    throw new Error('wx web not implement yet')
    // WechatyBro.glue.chatroomFactory.quit("@@1c066dfcab4ef467cd0a8da8bec90880035aa46526c44f504a83172a9086a5f7"
  }

  public topic()                : string
  public topic(newTopic: string): Promise<void>

  public topic(newTopic?: string): string | Promise<void> {
    log.verbose('PuppeteerRoom', 'topic(%s)', newTopic ? newTopic : '')
    if (!this.isReady()) {
      log.warn('PuppeteerRoom', 'topic() room not ready')
    }

    if (typeof newTopic === 'undefined') {
      return Misc.plainText(this.payload ? this.payload.topic : '')
    }

    this.puppet
        .roomTopic(this, newTopic)
        .catch(e => {
          log.warn('PuppeteerRoom', 'topic(newTopic=%s) exception: %s',
                            newTopic, e && e.message || e,
                  )
          Raven.captureException(e)
        })

    if (!this.payload) {
      this.payload = <RoomPayload>{}
    }
    this.payload.topic = newTopic
    return Promise.resolve()
  }

  /**
   * should be deprecated
   * @private
   */
  public nick(contact: PuppeteerContact): string | null {
    log.warn('PuppeteerRoom', 'nick(Contact) DEPRECATED, use alias(Contact) instead.')
    return this.alias(contact)
  }

  /**
   * Return contact's roomAlias in the room, the same as roomAlias
   * @param {PuppeteerContact} contact
   * @returns {string | null} - If a contact has an alias in room, return string, otherwise return null
   * @example
   * const bot = Wechaty.instance()
   * bot
   * .on('message', async m => {
   *   const room = m.room()
   *   const contact = m.from()
   *   if (room) {
   *     const alias = room.alias(contact)
   *     console.log(`${contact.name()} alias is ${alias}`)
   *   }
   * })
   */
  public alias(contact: PuppeteerContact): string | null {
    return this.roomAlias(contact)
  }

  /**
   * Same as function alias
   * @param {PuppeteerContact} contact
   * @returns {(string | null)}
   */
  public roomAlias(contact: PuppeteerContact): string | null {
    if (!this.payload || !this.payload.roomAliasMap) {
      return null
    }
    return this.payload.roomAliasMap.get(contact.id) || null
  }

  /**
   * Check if the room has member `contact`.
   *
   * @param {PuppeteerContact} contact
   * @returns {boolean} Return `true` if has contact, else return `false`.
   * @example <caption>Check whether 'lijiarui' is in the room 'wechaty'</caption>
   * const contact = await Contact.find({name: 'lijiarui'})   // change 'lijiarui' to any of contact in your wechat
   * const room = await Room.find({topic: 'wechaty'})         // change 'wechaty' to any of the room in your wechat
   * if (contact && room) {
   *   if (room.has(contact)) {
   *     console.log(`${contact.name()} is in the room ${room.topic()}!`)
   *   } else {
   *     console.log(`${contact.name()} is not in the room ${room.topic()} !`)
   *   }
   * }
   */
  public has(contact: PuppeteerContact): boolean {
    if (!this.payload || !this.payload.memberList) {
      return false
    }
    return this.payload.memberList
                    .filter(c => c.id === contact.id)
                    .length > 0
  }

  public memberAll(filter: RoomMemberQueryFilter): PuppeteerContact[]

  public memberAll(name: string): PuppeteerContact[]

  /**
   * The way to search member by Room.member()
   *
   * @typedef    MemberQueryFilter
   * @property   {string} name            -Find the contact by wechat name in a room, equal to `Contact.name()`.
   * @property   {string} alias           -Find the contact by alias set by the bot for others in a room, equal to `roomAlias`.
   * @property   {string} roomAlias       -Find the contact by alias set by the bot for others in a room.
   * @property   {string} contactAlias    -Find the contact by alias set by the contact out of a room, equal to `Contact.alias()`.
   * [More Detail]{@link https://github.com/Chatie/wechaty/issues/365}
   */

  /**
   * Find all contacts in a room
   *
   * #### definition
   * - `name`                 the name-string set by user-self, should be called name, equal to `Contact.name()`
   * - `roomAlias` | `alias`  the name-string set by user-self in the room, should be called roomAlias
   * - `contactAlias`         the name-string set by bot for others, should be called alias, equal to `Contact.alias()`
   * @param {(RoomMemberQueryFilter | string)} queryArg -When use memberAll(name:string), return all matched members, including name, roomAlias, contactAlias
   * @returns {PuppeteerContact[]}
   * @memberof Room
   */
  public memberAll(queryArg: RoomMemberQueryFilter | string): PuppeteerContact[] {
    if (typeof queryArg === 'string') {
      // TODO: filter the duplicated result
      return ([] as PuppeteerContact[]).concat(
        this.memberAll({name:         queryArg}),
        this.memberAll({roomAlias:    queryArg}),
        this.memberAll({contactAlias: queryArg}),
      )
    }

    /**
     * We got filter parameter
     */
    log.silly('PuppeteerRoom', 'memberAll({ %s })',
                                JSON.stringify(queryArg),
                      // Object.keys(queryArg)
                      //       .map((k: keyof RoomMemberQueryFilter) => `${k}: ${queryArg[k]}`)
                      //       .join(', '),
              )

    if (Object.keys(queryArg).length !== 1) {
      throw new Error('Room member find queryArg only support one key. multi key support is not availble now.')
    }

    if (!this.payload || !this.payload.memberList) {
      log.warn('PuppeteerRoom', 'member() not ready')
      return []
    }
    const filterKey = Object.keys(queryArg)[0] as keyof RoomMemberQueryFilter
    /**
     * ISSUE #64 emoji need to be striped
     */
    const filterValue: string = Misc.stripEmoji(Misc.plainText(queryArg[filterKey]))

    const keyMap = {
      contactAlias: 'contactAliasMap',
      name:         'nameMap',
      alias:        'roomAliasMap',
      roomAlias:    'roomAliasMap',
    }

    const filterMapName = keyMap[filterKey] as keyof RoomPayload
    if (!filterMapName) {
      throw new Error('unsupport filter key: ' + filterKey)
    }

    if (!filterValue) {
      throw new Error('filterValue not found')
    }

    const filterMap = this.payload[filterMapName] as Map<string, string>
    const idList = Array.from(filterMap.keys())
                          .filter(id => filterMap.get(id) === filterValue)

    log.silly('PuppeteerRoom', 'memberAll() check %s from %s: %s', filterValue, filterKey, JSON.stringify(filterMap))

    if (idList.length) {
      return idList.map(id => {
        const c = PuppeteerContact.load(id) as PuppeteerContact
        c.puppet = this.puppet
        return c
      })
    } else {
      return []
    }
  }

  public member(name  : string)               : null | PuppeteerContact
  public member(filter: RoomMemberQueryFilter): null | PuppeteerContact

  public member(
    queryArg: RoomMemberQueryFilter | string,
  ): null | PuppeteerContact {
    log.verbose('PuppeteerRoom', 'member(%s)', JSON.stringify(queryArg))

    let memberList: PuppeteerContact[]
    // ISSUE #622
    // error TS2345: Argument of type 'string | MemberQueryFilter' is not assignable to parameter of type 'MemberQueryFilter' #622
    if (typeof queryArg === 'string') {
      memberList =  this.memberAll(queryArg)
    } else {
      memberList =  this.memberAll(queryArg)
    }

    if (!memberList || !memberList.length) {
      return null
    }

    if (memberList.length > 1) {
      log.warn('PuppeteerRoom', 'member(%s) get %d contacts, use the first one by default', JSON.stringify(queryArg), memberList.length)
    }
    return memberList[0]
  }

  public memberList(): PuppeteerContact[] {
    log.verbose('PuppeteerRoom', 'memberList')

    if (!this.payload || !this.payload.memberList || this.payload.memberList.length < 1) {
      log.warn('PuppeteerRoom', 'memberList() not ready')
      log.verbose('PuppeteerRoom', 'memberList() trying call refresh() to update')
      this.refresh().then(() => {
        log.verbose('PuppeteerRoom', 'memberList() refresh() done')
      })
      return []
    }
    return this.payload.memberList
  }

  // public static async create(contactList: PuppeteerContact[], topic?: string): Promise<Room> {
  //   log.verbose('PuppeteerRoom', 'create(%s, %s)', contactList.join(','), topic)

  //   if (!contactList || !Array.isArray(contactList)) {
  //     throw new Error('contactList not found')
  //   }

  //   try {
  //     const room = await this.puppet.roomCreate(contactList, topic)
  //     return room
  //   } catch (e) {
  //     log.error('PuppeteerRoom', 'create() exception: %s', e && e.stack || e.message || e)
  //     Raven.captureException(e)
  //     throw e
  //   }
  // }

  public async sync(): Promise<void> {
    // if (this.isReady()) {
    //   this.dirtyObj = this.payload
    // }
    this.payload = undefined
    await this.ready()
  }

  public async refresh(): Promise<void> {
    return this.sync()
  }

  /**
   * @private
   * Get room's owner from the room.
   * Not recommend, because cannot always get the owner
   * @returns {(Contact | null)}
   */
  public owner(): PuppeteerContact | null {
    log.info('PuppeteerRoom', 'owner() is limited by Tencent API, sometimes work sometimes not')
    return null
  }

}

export default PuppeteerRoom
