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

import type { PuppetSkeleton } from '../puppet/puppet-skeleton.js'
import type { ContactMixin }  from './contact-mixin.js'
import { DirtyType } from '../schemas/dirty.js'

const roomMemberMixin = <MixinBase extends typeof PuppetSkeleton & ContactMixin>(mixinBase: MixinBase) => {

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
      query  : (symbol | string) | RoomMemberQueryFilter,
    ): Promise<string[]> {
      log.verbose('PuppetRoomMemberMixin', 'roomMemberSearch(%s, %s)', roomId, JSON.stringify(query))

      if (!this.isLoggedIn) {
        throw new Error('no puppet.id. need puppet to be login-ed for a search')
      }
      if (!query) {
        throw new Error('no query')
      }

      /**
        * 0. for YOU: 'You', '你' in sys message
        */
      if (typeof query === 'symbol') {
        if (query === YOU) {
          return [this.currentUserId]
        }
        /**
         * Huan(202111): We use `symbol` instead of `uniq symbol` in the method argument
         *  so that the interface code can be compatible with different npm modules.
         *
         * i.e. in Wechaty docker, sometimes there will be `/wechaty/node_modules/wechaty-puppet`
         *  and the `/bot/node_modules/wechaty-puppet` two different npm modules installed together,
         *  and cause conflict if we use `uniq symbol` to check the symbol type.
         */
        throw new Error('unknown symbol found: ' + String(query))
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
      const cachedPayload = this.cache.roomMember.get(roomId)
      const memberPayload = cachedPayload && cachedPayload[memberId]

      if (memberPayload) {
        return memberPayload
      }

      /**
        * 2. Cache not found
        */
      const rawPayload = await this.roomMemberRawPayload(roomId, memberId)
      if (!rawPayload) {
        throw new Error('contact(' + memberId + ') is not in the Room(' + roomId + ')')
      }
      const payload = await this.roomMemberRawPayloadParser(rawPayload)

      this.cache.roomMember.set(roomId, {
        ...cachedPayload,
        memberId: payload,
      })
      log.silly('PuppetRoomMemberMixin', 'roomMemberPayload(%s) cache SET', roomId)

      return payload
    }

    async roomMemberPayloadDirty (
      id: string,
    ): Promise<void> {
      log.verbose('PuppetRoomMemberMixin', 'roomMemberPayloadDirty(%s)', id)

      await this.__dirtyPayloadAwait(
        DirtyType.RoomMember,
        id,
      )
    }

  }

  return RoomMemberMixin
}

type RoomMemberMixin = ReturnType<typeof roomMemberMixin>

type ProtectedPropertyRoomMemberMixin =
| 'roomMemberRawPayload'
| 'roomMemberRawPayloadParser'

export type {
  ProtectedPropertyRoomMemberMixin,
  RoomMemberMixin,
}
export { roomMemberMixin }
