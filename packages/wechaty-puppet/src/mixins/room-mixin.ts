import type {
  FileBoxInterface,
}                       from 'file-box'

import {
  log,
}                       from '../config.js'
import type {
  RoomPayload,
  RoomPayloadFilterFunction,
  RoomQueryFilter,
}                                 from '../schemas/room.js'

import type { PuppetSkeleton } from '../puppet/puppet-skeleton.js'
import type { ContactMixin }  from './contact-mixin.js'
import type { RoomMemberMixin } from './room-member-mixin.js'
import { DirtyType } from '../schemas/dirty.js'

const roomMixin = <MixinBase extends typeof PuppetSkeleton & ContactMixin & RoomMemberMixin>(mixinBase: MixinBase) => {

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
    abstract roomAvatar (roomId: string)                                       : Promise<FileBoxInterface>
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

    async roomSearch (
      query?: RoomQueryFilter,
    ): Promise<string[] /* Room Id List */> {
      log.verbose('PuppetRoomMixin', 'roomSearch(%s)', query ? JSON.stringify(query) : '')

      /**
       * Huan(202110): optimize for search id
       */
      if (query?.id) {
        try {
          // make sure the room id has valid payload
          await this.roomPayload(query.id)
          return [query.id]
        } catch (e) {
          log.verbose('PuppetRoomMixin', 'roomSearch() payload not found for id "%s"', query.id)
          await this.roomPayloadDirty(query.id)
          return []
        }
      }

      /**
       * Deal with non-id queries
       */
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

        /**
         * Huan(202110): TODO: use an iterator with works to control the concurrency of Promise.all.
         *  @see https://stackoverflow.com/a/51020535/1123955
         */

        const batchPayloads = (await Promise.all(
          batchRoomIds.map(
            async id => {
              try {
                return await this.roomPayload(id)
              } catch (e) {
                // log.silly('PuppetRoomMixin', 'roomSearch() roomPayload exception: %s', (e as Error).message)
                this.emit('error', e)

                // Remove invalid room id from cache to avoid getting invalid room payload again
                await this.roomPayloadDirty(id)
                await this.roomMemberPayloadDirty(id)

                // compatible with {} payload
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

    async roomPayloadDirty (
      id: string,
    ): Promise<void> {
      log.verbose('PuppetRoomMixin', 'roomPayloadDirty(%s)', id)

      await this.__dirtyPayloadAwait(
        DirtyType.Room,
        id,
      )
    }

  }

  return RoomMixin
}

type RoomMixin = ReturnType<typeof roomMixin>

type ProtectedPropertyRoomMixin =
  | 'roomPayloadCache'
  | 'roomQueryFilterFactory'
  | 'roomRawPayload'
  | 'roomRawPayloadParser'

export type {
  RoomMixin,
  ProtectedPropertyRoomMixin,
}
export { roomMixin }
