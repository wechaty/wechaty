import {
  log,
}                       from '../config.js'
import type {
  FriendshipAddOptions,
  FriendshipPayload,
  FriendshipSearchQueryFilter,
}                                 from '../schemas/friendship.js'

import type { PuppetSkeleton }    from '../puppet/puppet-skeleton.js'
import { DirtyType }              from '../schemas/dirty.js'

import type { CacheMixin }  from './cache-mixin.js'

const friendshipMixin = <MixinBase extends typeof PuppetSkeleton & CacheMixin>(mixinBase: MixinBase) => {

  abstract class FriendshipMixin extends mixinBase {

    constructor (...args: any[]) {
      super(...args)
      log.verbose('PuppetFriendshipMixin', 'constructor()')
    }

    /**
     *
     * Friendship
     *
     */
    abstract friendshipAccept (friendshipId: string)           : Promise<void>
    abstract friendshipAdd (contactId: string, option?: FriendshipAddOptions) : Promise<void>

    abstract friendshipSearchPhone (phone: string)   : Promise<null | string>
    abstract friendshipSearchHandle (handle: string) : Promise<null | string>

    /**
     * Huan(202203): `friendshipSearchWeixin()` will be removed in Puppet v2.0
     * @deprecated use `friendshipSearchHandle()` instead.
     */
    friendshipSearchWeixin (weixin: string) : Promise<null | string> {
      log.warn('Puppet', 'friendshipSearchWeixin() is deprecated. use `friendshipSearchHandle()` instead.')
      console.error(new Error().stack)
      return this.friendshipSearchHandle(weixin)
    }

    /**
     * Issue #155 - https://github.com/wechaty/puppet/issues/155
     *
     * @protected
     */
    abstract friendshipRawPayload (friendshipId: string)  : Promise<any>

    /**
     * Issue #155 - https://github.com/wechaty/puppet/issues/155
     *
     * @protected
     */
    abstract friendshipRawPayloadParser (rawPayload: any) : Promise<FriendshipPayload>

    async friendshipSearch (
      searchQueryFilter: FriendshipSearchQueryFilter,
    ): Promise<string | null> {
      log.verbose('PuppetFriendshipMixin', 'friendshipSearch("%s")', JSON.stringify(searchQueryFilter))

      if (Object.keys(searchQueryFilter).length !== 1) {
        throw new Error('searchQueryFilter should only include one key for query!')
      }

      if (searchQueryFilter.phone) {
        return this.friendshipSearchPhone(searchQueryFilter.phone)
      } else if (searchQueryFilter.weixin) {
        /**
         * Huan(202203): `weixin` will be removed in Puppet v2.0
         * @deprecate use `handle` instead
         */
        log.warn('Puppet', 'friendshipSearch() `{ weixin: ... }` is deprecated. use `{ handle: ... }` instead.')
        console.error(new Error().stack)
        return this.friendshipSearchHandle(searchQueryFilter.weixin)
      } else if (searchQueryFilter.handle) {
        return this.friendshipSearchHandle(searchQueryFilter.handle)
      }

      throw new Error(`unknown key from searchQueryFilter: ${Object.keys(searchQueryFilter).join('')}`)
    }

    /**
     * Issue #155 - https://github.com/wechaty/puppet/issues/155
     *
     * @protected
     */
    friendshipPayloadCache (friendshipId: string): undefined | FriendshipPayload {
      log.silly('PuppetFriendshipMixin', 'friendshipPayloadCache(id=%s) @ %s', friendshipId, this)

      if (!friendshipId) {
        throw new Error('no id')
      }
      const cachedPayload = this.cache.friendship.get(friendshipId)

      if (cachedPayload) {
        // log.silly('PuppetFriendshipMixin', 'friendshipPayloadCache(%s) cache HIT', friendshipId)
      } else {
        log.silly('PuppetFriendshipMixin', 'friendshipPayloadCache(%s) cache MISS', friendshipId)
      }

      return cachedPayload
    }

    /**
      * Get & Set
      */
    async friendshipPayload (friendshipId: string)                                : Promise<FriendshipPayload>
    async friendshipPayload (friendshipId: string, newPayload: FriendshipPayload) : Promise<void>

    async friendshipPayload (
      friendshipId : string,
      newPayload?  : FriendshipPayload,
    ): Promise<void | FriendshipPayload> {
      log.verbose('PuppetFriendshipMixin', 'friendshipPayload(%s)',
        friendshipId,
        newPayload
          ? ',' + JSON.stringify(newPayload)
          : '',
      )

      if (typeof newPayload === 'object') {
        await this.cache.friendship.set(friendshipId, newPayload)
        return
      }

      /**
        * 1. Try to get from cache first
        */
      const cachedPayload = this.friendshipPayloadCache(friendshipId)
      if (cachedPayload) {
        return cachedPayload
      }

      /**
        * 2. Cache not found
        */
      const rawPayload = await this.friendshipRawPayload(friendshipId)
      const payload    = await this.friendshipRawPayloadParser(rawPayload)

      this.cache.friendship.set(friendshipId, payload)

      return payload
    }

    async friendshipPayloadDirty (
      id: string,
    ): Promise<void> {
      log.verbose('PuppetFriendshipMixin', 'friendshipPayloadDirty(%s)', id)

      await this.__dirtyPayloadAwait(
        DirtyType.Friendship,
        id,
      )
    }

  }

  return FriendshipMixin
}

type FriendshipMixin = ReturnType<typeof friendshipMixin>

type ProtectedPropertyFriendshipMixin =
  | 'friendshipRawPayload'
  | 'friendshipRawPayloadParser'
  | 'friendshipPayloadCache'

export type {
  FriendshipMixin,
  ProtectedPropertyFriendshipMixin,
}
export { friendshipMixin }
