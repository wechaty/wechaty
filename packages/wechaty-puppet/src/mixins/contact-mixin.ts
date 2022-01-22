import type {
  FileBoxInterface,
}                       from 'file-box'
import {
  log,
}                       from '../config.js'
import type { PuppetSkeleton } from '../puppet/puppet-skeleton.js'

import type {
  ContactPayload,
  ContactPayloadFilterFunction,
  ContactQueryFilter,
}                                 from '../schemas/contact.js'
import { DirtyType } from '../schemas/dirty.js'

import type { CacheMixin }    from './cache-mixin.js'

const contactMixin = <MixinBase extends CacheMixin & typeof PuppetSkeleton>(mixinBase: MixinBase) => {

  abstract class ContactMixin extends mixinBase {

    constructor (...args: any[]) {
      super(...args)
      log.verbose('PuppetContactMixin', 'constructor()')
    }

    /**
     *
     * ContactSelf
     *
     */
    abstract contactSelfName (name: string)           : Promise<void>
    abstract contactSelfQRCode ()                     : Promise<string /* QR Code Value */>
    abstract contactSelfSignature (signature: string) : Promise<void>

    /**
     *
     * Contact
     *
     */
    abstract contactAlias (contactId: string)                       : Promise<string>
    abstract contactAlias (contactId: string, alias: string | null) : Promise<void>

    abstract contactAvatar (contactId: string)                : Promise<FileBoxInterface>
    abstract contactAvatar (contactId: string, file: FileBoxInterface) : Promise<void>

    abstract contactPhone (contactId: string, phoneList: string[]) : Promise<void>

    abstract contactCorporationRemark (contactId: string, corporationRemark: string | null): Promise<void>

    abstract contactDescription (contactId: string, description: string | null): Promise<void>

    abstract contactList (): Promise<string[]>

    /**
     * @protected Issue #155 - https://github.com/wechaty/puppet/issues/155
     */
    abstract contactRawPayload (contactId: string): Promise<any>
    /**
     * @protected Issue #155 - https://github.com/wechaty/puppet/issues/155
     */
    abstract contactRawPayloadParser (rawPayload: any) : Promise<ContactPayload>

    // async contactRoomList (
    //   contactId: string,
    // ): Promise<string[] /* roomId */> {
    //   log.verbose('PuppetContactMixin', 'contactRoomList(%s)', contactId)

    //   const roomIdList = await this.roomList()
    //   const roomPayloadList = await Promise.all(
    //     roomIdList.map(
    //       roomId => this.roomPayload(roomId),
    //     ),
    //   )
    //   const resultRoomIdList = roomPayloadList
    //     .filter(roomPayload => roomPayload.memberIdList.includes(contactId))
    //     .map(payload => payload.id)

    //   return resultRoomIdList
    // }

    /**
     * @param query {string | Object} if string, then search `name` & `alias`
     */
    async contactSearch (
      query?        : string | ContactQueryFilter,
      searchIdList? : string[],
    ): Promise<string[]> {
      log.verbose('PuppetContactMixin', 'contactSearch(query=%s, %s)',
        JSON.stringify(query),
        searchIdList
          ? `idList.length = ${searchIdList.length}`
          : '',
      )

      /**
       * Huan(202110): optimize for search id
       */
      if (typeof query !== 'string' && query?.id) {
        try {
          // make sure the contact id has valid payload
          await this.contactPayload(query.id)
          return [query.id]
        } catch (e) {
          log.verbose('PuppetContactMixin', 'contactSearch() payload not found for id "%s"', query.id)
          await this.contactPayloadDirty(query.id)
          return []
        }
      }

      /**
       * Deal non-id queries
       */
      if (!searchIdList) {
        searchIdList = await this.contactList()
      }

      log.silly('PuppetContactMixin', 'contactSearch() searchIdList.length = %d', searchIdList.length)

      if (!query) {
        return searchIdList
      }

      if (typeof query === 'string') {
        const nameIdList  = await this.contactSearch({ name: query },  searchIdList)
        const aliasIdList = await this.contactSearch({ alias: query }, searchIdList)

        return Array.from(
          new Set([
            ...nameIdList,
            ...aliasIdList,
          ]),
        )
      }

      const filterFunction: ContactPayloadFilterFunction = this.contactQueryFilterFactory(query)

      const BATCH_SIZE = 16
      let   batchIndex = 0

      const resultIdList: string[] = []

      const matchId = async (id: string) => {
        try {
          /**
           * Does LRU cache matter at here?
           */
          // const rawPayload = await this.contactRawPayload(id)
          // const payload    = await this.contactRawPayloadParser(rawPayload)
          const payload = await this.contactPayload(id)

          if (filterFunction(payload)) {
            return id
          }

        } catch (e) {
          this.emit('error', e)
          await this.contactPayloadDirty(id)
        }
        return undefined
      }

      while (BATCH_SIZE * batchIndex < searchIdList.length) {
        const batchSearchIdList  = searchIdList.slice(
          BATCH_SIZE * batchIndex,
          BATCH_SIZE * (batchIndex + 1),
        )

        /**
         * Huan(202110): TODO: use an iterator with works to control the concurrency of Promise.all.
         *  @see https://stackoverflow.com/a/51020535/1123955
         */

        const matchBatchIdFutureList = batchSearchIdList.map(matchId)
        const matchBatchIdList       = await Promise.all(matchBatchIdFutureList)

        const batchSearchIdResultList: string[] = matchBatchIdList.filter(id => !!id) as string[]

        resultIdList.push(...batchSearchIdResultList)

        batchIndex++
      }

      log.silly('PuppetContactMixin', 'contactSearch() searchContactPayloadList.length = %d', resultIdList.length)

      return resultIdList
    }

    /**
     * Issue #155 - https://github.com/wechaty/puppet/issues/155
     *
     * @protected
     */
    contactQueryFilterFactory (
      query: ContactQueryFilter,
    ): ContactPayloadFilterFunction {
      log.verbose('PuppetContactMixin', 'contactQueryFilterFactory(%s)',
        JSON.stringify(query),
      )

      /**
       * Clean the query for keys with empty value
       */
      Object.keys(query).forEach(key => {
        if (query[key as keyof ContactQueryFilter] === undefined) {
          delete query[key as keyof ContactQueryFilter]
        }
      })

      if (Object.keys(query).length < 1) {
        throw new Error('query must provide at least one key. current query is empty.')
      } else if (Object.keys(query).length > 1) {
        throw new Error('query only support one key. multi key support is not available now.')
      }
      // Huan(202105): we use `!` at here because the above `if` checks
      const filterKey = Object.keys(query)[0]!.toLowerCase() as keyof ContactQueryFilter

      const isValid = [
        'alias',
        'id',
        'name',
        'weixin',
      ].includes(filterKey)

      if (!isValid) {
        throw new Error('key not supported: ' + filterKey)
      }

      // TypeScript bug: have to set `undefined | string | RegExp` at here, or the later code type check will get error
      const filterValue: undefined | string | RegExp = query[filterKey]
      if (!filterValue) {
        throw new Error('filterValue not found for filterKey: ' + filterKey)
      }

      let filterFunction

      if (typeof filterValue === 'string') {
        filterFunction = (payload: ContactPayload) => filterValue === payload[filterKey]
      } else if (filterValue instanceof RegExp) {
        filterFunction = (payload: ContactPayload) => !!payload[filterKey] && filterValue.test(payload[filterKey]!)
      } else {
        throw new Error('unsupported filterValue type: ' + typeof filterValue)
      }

      return filterFunction
    }

    /**
     * Check a Contact Id if it's still valid.
     *  For example: talk to the server, and see if it should be deleted in the local cache.
     */
    async contactValidate (contactId: string) : Promise<boolean> {
      log.silly('PuppetContactMixin', 'contactValidate(%s) base class just return `true`', contactId)
      return true
    }

    /**
     * Issue #155 - https://github.com/wechaty/puppet/issues/155
     *
     * @protected
     */
    contactPayloadCache (contactId: string): undefined | ContactPayload {
      // log.silly('PuppetContactMixin', 'contactPayloadCache(id=%s) @ %s', contactId, this)
      if (!contactId) {
        throw new Error('no id')
      }
      const cachedPayload = this.cache.contact.get(contactId)

      if (cachedPayload) {
        // log.silly('PuppetContactMixin', 'contactPayload(%s) cache HIT', contactId)
      } else {
        log.silly('PuppetContactMixin', 'contactPayload(%s) cache MISS', contactId)
      }

      return cachedPayload
    }

    async contactPayload (
      contactId: string,
    ): Promise<ContactPayload> {
      // log.silly('PuppetContactMixin', 'contactPayload(id=%s) @ %s', contactId, this)

      if (!contactId) {
        throw new Error('no id')
      }

      /**
       * 1. Try to get from cache first
       */
      const cachedPayload = this.contactPayloadCache(contactId)
      if (cachedPayload) {
        return cachedPayload
      }

      /**
       * 2. Cache not found
       */
      const rawPayload = await this.contactRawPayload(contactId)
      const payload    = await this.contactRawPayloadParser(rawPayload)

      this.cache.contact.set(contactId, payload)
      log.silly('PuppetContactMixin', 'contactPayload(%s) cache SET', contactId)

      return payload
    }

    async contactPayloadDirty (
      id: string,
    ): Promise<void> {
      log.verbose('PuppetContactMixin', 'contactPayloadDirty(%s)', id)

      await this.__dirtyPayloadAwait(
        DirtyType.Contact,
        id,
      )
    }

  }

  return ContactMixin
}

type ProtectedPropertyContactMixin =
| 'contactRawPayload'
| 'contactRawPayloadParser'
| 'contactQueryFilterFactory'
| 'contactPayloadCache'

type ContactMixin = ReturnType<typeof contactMixin>

export type {
  ContactMixin,
  ProtectedPropertyContactMixin,
}
export { contactMixin }
