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
import {
  log,
}                       from '../config'
import {
  Room,
  RoomMemberQueryFilter,
}                         from '../puppet/'

import { MockMessage }    from './mock-message'
import { MockContact }    from './mock-contact'

export class MockRoom extends Room {

  constructor(
    public id: string,
  ) {
    super(id)
    log.silly('MockRoom', `constructor(${id})`)
  }

  public isReady(): boolean {
    return true
  }

  public async sync(): Promise<void> {
    return
  }

  public async ready(): Promise<void> {
    return
  }

  public say(message: MockMessage)                  : Promise<void>
  public say(text: string)                          : Promise<void>
  public say(text: string, replyTo: MockContact)    : Promise<void>
  public say(text: string, replyTo: MockContact[])  : Promise<void>
  public say(text: never, ...args: never[])         : Promise<never>

  public async say(textOrMessage: string | MockMessage, replyTo?: MockContact|MockContact[]): Promise<void> {
    log.verbose('MockRoom', 'say(%s, %s)',
                        textOrMessage,
                        Array.isArray(replyTo)
                        ? replyTo.map(c => c.name()).join(', ')
                        : replyTo ? replyTo.name() : '',
    )

    let m
    m = new MockMessage()
    m.puppet = this.puppet
    m.room(this)

    await this.puppet.send(m)
  }

  public async add(contact: MockContact): Promise<void> {
    log.verbose('MockRoom', 'add(%s)', contact)
    await this.puppet.roomAdd(this, contact)
  }

  public async del(contact: MockContact): Promise<void> {
    log.verbose('MockRoom', 'del(%s)', contact.name())
    await this.puppet.roomDel(this, contact)
  }

  public async quit(): Promise<void> {
    return
  }

  public topic()                      : string
  public async topic(newTopic: string): Promise<void>

  public topic(newTopic?: string): string | Promise<void> {
    log.verbose('MockRoom', 'topic(%s)', newTopic ? newTopic : '')

    if (typeof newTopic === 'undefined') {
      return 'mock topic'
    }

    this.puppet.roomTopic(this, newTopic)
          .catch(e => {
            log.warn('MockRoom', 'topic(newTopic=%s) exception: %s',
                              newTopic, e && e.message || e,
                    )
          })

    return Promise.resolve()
  }

  public alias(contact: MockContact): string | null {
    return this.roomAlias(contact)
  }

  public roomAlias(contact: MockContact): string | null {
    return 'mock room alias'
  }

  public has(contact: MockContact): boolean {
    return false
  }

  public memberAll(filter: RoomMemberQueryFilter) : MockContact[]
  public memberAll(name: string)                  : MockContact[]

  public memberAll(queryArg: RoomMemberQueryFilter | string): MockContact[] {
    return []
  }

  public member(name: string)                 : MockContact | null
  public member(filter: RoomMemberQueryFilter): MockContact | null

  public member(queryArg: RoomMemberQueryFilter | string): MockContact | null {
    log.verbose('MockRoom', 'member(%s)', JSON.stringify(queryArg))
    return null
  }

  public memberList(): MockContact[] {
    log.verbose('MockRoom', 'memberList')
    return []
  }

  public static async create(contactList: MockContact[], topic?: string): Promise<Room> {
    log.verbose('MockRoom', 'create(%s, %s)', contactList.join(','), topic)
    const room = await this.puppet.roomCreate(contactList, topic)
    return room
  }

  public async refresh(): Promise<void> {
    return
  }

  public owner(): MockContact | null {
    log.info('MockRoom', 'owner()')
    return null
  }

}

export default MockRoom
