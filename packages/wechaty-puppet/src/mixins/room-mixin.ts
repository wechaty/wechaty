import {
  FileBox,
  log,
}                       from '../config.js'

import type {
  ContactQueryFilter,
}                                 from '../schemas/contact.js'
import type {
  RoomMemberPayload,
  RoomMemberQueryFilter,
  RoomPayload,
  RoomPayloadFilterFunction,
  RoomQueryFilter,
}                                 from '../schemas/room.js'
import {
  YOU,
}                                 from '../schemas/puppet.js'

import type { PuppetSkelton } from '../puppet/skelton.js'
import type { ContactMixin }  from './contact-mixin.js'

const roomMixin = <MixinBase extends typeof PuppetSkelton & ContactMixin>(mixinBase: MixinBase) => {

  abstract class RoomMixin extends mixinBase {

    constructor (...args: any[]) {
      super(...args)
      log.verbose('PuppetRoomMixin', 'constructor()')
    }

    /**
     *
     * Room
     *
     */
    abstract roomAdd (roomId: string, contactId: string, inviteOnly?: boolean) : Promise<void>
    abstract roomAvatar (roomId: string)                                       : Promise<FileBox>
    abstract roomCreate (contactIdList: string[], topic?: string)              : Promise<string>
    abstract roomDel (roomId: string, contactId: string)                       : Promise<void>
    abstract roomList ()                                                       : Promise<string[]>
    abstract roomQRCode (roomId: string)                                       : Promise<string>
    abstract roomQuit (roomId: string)                                         : Promise<void>
    abstract roomTopic (roomId: string)                                        : Promise<string>
    abstract roomTopic (roomId: string, topic: string)                         : Promise<void>

    /**
     * Issue #155 - https://github.com/wechaty/puppet/issues/155
     *
     * @protected
     */
    abstract roomRawPayload (roomId: string)        : Promise<any>

    /**
     * Issue #155 - https://github.com/wechaty/puppet/issues/155
     *
     * @protected
     */
    abstract roomRawPayloadParser (rawPayload: any) : Promise<RoomPayload>

    /**
      *
      * RoomMember
      *
      */
    abstract roomAnnounce (roomId: string)               : Promise<string>
    abstract roomAnnounce (roomId: string, text: string) : Promise<void>
    abstract roomMemberList (roomId: string)             : Promise<string[]>

    /**
     * Issue #155 - https://github.com/wechaty/puppet/issues/155
     *
     * @protected
     */
    abstract roomMemberRawPayload (roomId: string, contactId: string) : Promise<any>

    /**
     * Issue #155 - https://github.com/wechaty/puppet/issues/155
     *
     * @protected
     */
    abstract roomMemberRawPayloadParser (rawPayload: any)             : Promise<RoomMemberPayload>

    async roomMemberSearch (
      roomId : string,
      query  : (YOU | string) | RoomMemberQueryFilter,
    ): Promise<string[]> {
      log.verbose('PuppetRoomMixin', 'roomMemberSearch(%s, %s)', roomId, JSON.stringify(query))

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

    async roomSearch (
      query?: RoomQueryFilter,
    ): Promise<string[] /* Room Id List */> {
      log.verbose('PuppetRoomMixin', 'roomSearch(%s)', query ? JSON.stringify(query) : '')

      const allRoomIdList: string[] = await this.roomList()
      log.silly('PuppetRoomMixin', 'roomSearch() allRoomIdList.length=%d', allRoomIdList.length)

      if (!query || Object.keys(query).length <= 0) {
        return allRoomIdList
      }

      const roomPayloadList: RoomPayload[] = []

      const BATCH_SIZE = 10
      let   batchIndex = 0

      while (batchIndex * BATCH_SIZE < allRoomIdList.length) {
        const batchRoomIds = allRoomIdList.slice(
          BATCH_SIZE * batchIndex,
          BATCH_SIZE * (batchIndex + 1),
        )

        const batchPayloads = (await Promise.all(
          batchRoomIds.map(
            async id => {
              try {
                return await this.roomPayload(id)
              } catch (e) {
                // compatible with {} payload
                log.silly('PuppetRoomMixin', 'roomSearch() roomPayload exception: %s', (e as Error).message)
                // Remove invalid room id from cache to avoid getting invalid room payload again
                await this.dirtyPayloadRoom(id)
                await this.dirtyPayloadRoomMember(id)
                return {} as any
              }
            },
          ),
        )).filter(payload => Object.keys(payload).length > 0)

        roomPayloadList.push(...batchPayloads)
        batchIndex++
      }

      const filterFunction = this.roomQueryFilterFactory(query)

      const roomIdList = roomPayloadList
        .filter(filterFunction)
        .map(payload => payload.id)

      log.silly('PuppetRoomMixin', 'roomSearch() roomIdList filtered. result length=%d', roomIdList.length)

      return roomIdList
    }

    /**
     * Issue #155 - https://github.com/wechaty/puppet/issues/155
     *
     * @protected
     */
    roomQueryFilterFactory (
      query: RoomQueryFilter,
    ): RoomPayloadFilterFunction {
      log.verbose('PuppetRoomMixin', 'roomQueryFilterFactory(%s)',
        JSON.stringify(query),
      )

      if (Object.keys(query).length < 1) {
        throw new Error('query must provide at least one key. current query is empty.')
      } else if (Object.keys(query).length > 1) {
        throw new Error('query only support one key. multi key support is not available now.')
      }
      // Huan(202105): we use `Object.keys(query)[0]!` with `!` at here because we have the above `if` checks
      // TypeScript bug: have to set `undefined | string | RegExp` at here, or the later code type check will get error
      const filterKey = Object.keys(query)[0]!.toLowerCase() as keyof RoomQueryFilter

      const isValid = [
        'topic',
        'id',
      ].includes(filterKey)

      if (!isValid) {
        throw new Error('query key unknown: ' + filterKey)
      }

      const filterValue: undefined | string | RegExp = query[filterKey]
      if (!filterValue) {
        throw new Error('filterValue not found for filterKey: ' + filterKey)
      }

      let filterFunction: RoomPayloadFilterFunction

      if (filterValue instanceof RegExp) {
        filterFunction = (payload: RoomPayload) => filterValue.test(payload[filterKey])
      } else { // if (typeof filterValue === 'string') {
        filterFunction = (payload: RoomPayload) => filterValue === payload[filterKey]
      }

      return filterFunction
    }

    /**
      * Check a Room Id if it's still valid.
      *  For example: talk to the server, and see if it should be deleted in the local cache.
      */
    async roomValidate (roomId: string): Promise<boolean> {
      log.silly('PuppetRoomMixin', 'roomValidate(%s) base class just return `true`', roomId)
      return true
    }

    /**
     * Issue #155 - https://github.com/wechaty/puppet/issues/155
     *
     * @protected
     */
    roomPayloadCache (roomId: string): undefined | RoomPayload {
      // log.silly('PuppetRoomMixin', 'roomPayloadCache(id=%s) @ %s', roomId, this)
      if (!roomId) {
        throw new Error('no id')
      }
      const cachedPayload = this.cache.room.get(roomId)
      if (cachedPayload) {
        // log.silly('PuppetRoomMixin', 'roomPayloadCache(%s) cache HIT', roomId)
      } else {
        log.silly('PuppetRoomMixin', 'roomPayloadCache(%s) cache MISS', roomId)
      }

      return cachedPayload
    }

    async roomPayload (
      roomId: string,
    ): Promise<RoomPayload> {
      log.verbose('PuppetRoomMixin', 'roomPayload(%s)', roomId)

      if (!roomId) {
        throw new Error('no id')
      }

      /**
        * 1. Try to get from cache first
        */
      const cachedPayload = this.roomPayloadCache(roomId)
      if (cachedPayload) {
        return cachedPayload
      }

      /**
        * 2. Cache not found
        */
      const rawPayload = await this.roomRawPayload(roomId)
      const payload    = await this.roomRawPayloadParser(rawPayload)

      this.cache.room.set(roomId, payload)
      log.silly('PuppetRoomMixin', 'roomPayload(%s) cache SET', roomId)

      return payload
    }

    async roomMemberPayload (
      roomId    : string,
      memberId : string,
    ): Promise<RoomMemberPayload> {
      log.verbose('PuppetRoomMixin', 'roomMemberPayload(roomId=%s, memberId=%s)',
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
      log.silly('PuppetRoomMixin', 'roomMemberPayload(%s) cache SET', roomId)

      return payload
    }

    /**
     * Huan(202110): FIXME: re-design the dirtyXXX
     *  remove private temporary
     */
    async dirtyPayloadRoom (roomId: string): Promise<void> {
      log.verbose('PuppetRoomMixin', 'dirtyPayloadRoom(%s)', roomId)
      this.cache.room.delete(roomId)
    }

    async dirtyPayloadRoomMember (roomId: string): Promise<void> {
      log.verbose('PuppetRoomMixin', 'dirtyPayloadRoomMember(%s)', roomId)

      const contactIdList = await this.roomMemberList(roomId)

      let cacheKey
      contactIdList.forEach(contactId => {
        cacheKey = this.cache.roomMemberId(roomId, contactId)
        this.cache.roomMember.delete(cacheKey)
      })
    }

  }

  return RoomMixin
}

export { roomMixin }
