import {
  log,
}                       from '../config.js'

import type {
  ContactQueryFilter,
}                                 from '../schemas/contact.js'
import type {
  RoomMemberPayload,
  RoomMemberQueryFilter,
}                                 from '../schemas/room.js'
import {
  YOU,
}                                 from '../schemas/puppet.js'

import type { PuppetSkelton } from '../puppet/skelton.js'
import type { ContactMixin }  from './contact-mixin.js'

const roomMemberMixin = <MixinBase extends typeof PuppetSkelton & ContactMixin>(mixinBase: MixinBase) => {

  abstract class RoomMemberMixin extends mixinBase {

    constructor (...args: any[]) {
      super(...args)
      log.verbose('PuppetRoomMemberMixin', 'constructor()')
    }

    abstract roomMemberList (roomId: string): Promise<string[]>

    /** @protected */
    abstract roomMemberRawPayload (roomId: string, contactId: string): Promise<any>
    /** @protected */
    abstract roomMemberRawPayloadParser (rawPayload: any): Promise<RoomMemberPayload>

    async roomMemberSearch (
      roomId : string,
      query  : (YOU | string) | RoomMemberQueryFilter,
    ): Promise<string[]> {
      log.verbose('PuppetRoomMemberMixin', 'roomMemberSearch(%s, %s)', roomId, JSON.stringify(query))

      if (!this.id) {
        throw new Error('no puppet.id. need puppet to be login-ed for a search')
      }
      if (!query) {
        throw new Error('no query')
      }

      /**
        * 0. for YOU: 'You', '你' in sys message
        */
      if (query === YOU) {
        return [this.id]
      }

      /**
        * 1. for Text Query
        */
      if (typeof query === 'string') {
        let contactIdList: string[] = []
        contactIdList = contactIdList.concat(
          await this.roomMemberSearch(roomId, { roomAlias:     query }),
          await this.roomMemberSearch(roomId, { name:          query }),
          await this.roomMemberSearch(roomId, { contactAlias:  query }),
        )
        // Keep the unique id only
        // https://stackoverflow.com/a/14438954/1123955
        // return [...new Set(contactIdList)]
        return Array.from(
          new Set(contactIdList),
        )
      }

      /**
        * 2. for RoomMemberQueryFilter
        */
      const memberIdList = await this.roomMemberList(roomId)

      let idList: string[] = []

      if (query.contactAlias || query.name) {
        /**
          * We will only have `alias` or `name` set at here.
          * One is set, the other will be `undefined`
          */
        const contactQueryFilter: ContactQueryFilter = {
          alias : query.contactAlias,
          name  : query.name,
        }

        idList = idList.concat(
          await this.contactSearch(
            contactQueryFilter,
            memberIdList,
          ),
        )
      }

      const memberPayloadList = await Promise.all(
        memberIdList.map(
          contactId => this.roomMemberPayload(roomId, contactId),
        ),
      )

      if (query.roomAlias) {
        idList = idList.concat(
          memberPayloadList.filter(
            payload => payload.roomAlias === query.roomAlias,
          ).map(payload => payload.id),
        )
      }

      return idList
    }

    async roomMemberPayload (
      roomId    : string,
      memberId : string,
    ): Promise<RoomMemberPayload> {
      log.verbose('PuppetRoomMemberMixin', 'roomMemberPayload(roomId=%s, memberId=%s)',
        roomId,
        memberId,
      )

      if (!roomId || !memberId) {
        throw new Error('no id')
      }

      /**
        * 1. Try to get from cache
        */
      const CACHE_KEY     = this.cache.roomMemberId(roomId, memberId)
      const cachedPayload = this.cache.roomMember.get(CACHE_KEY)

      if (cachedPayload) {
        return cachedPayload
      }

      /**
        * 2. Cache not found
        */
      const rawPayload = await this.roomMemberRawPayload(roomId, memberId)
      if (!rawPayload) {
        throw new Error('contact(' + memberId + ') is not in the Room(' + roomId + ')')
      }
      const payload    = await this.roomMemberRawPayloadParser(rawPayload)

      this.cache.roomMember.set(CACHE_KEY, payload)
      log.silly('PuppetRoomMemberMixin', 'roomMemberPayload(%s) cache SET', roomId)

      return payload
    }

    async dirtyPayloadRoomMember (roomId: string): Promise<void> {
      log.verbose('PuppetRoomMemberMixin', 'dirtyPayloadRoomMember(%s)', roomId)

      const contactIdList = await this.roomMemberList(roomId)

      let cacheKey
      contactIdList.forEach(contactId => {
        cacheKey = this.cache.roomMemberId(roomId, contactId)
        this.cache.roomMember.delete(cacheKey)
      })
    }

  }

  return RoomMemberMixin
}

type RoomMemberMixin = ReturnType<typeof roomMemberMixin>

type ProtectedPropertyRoomMemberMixin = never
| 'roomMemberRawPayload'
| 'roomMemberRawPayloadParser'

export type {
  ProtectedPropertyRoomMemberMixin,
  RoomMemberMixin,
}
export { roomMemberMixin }
