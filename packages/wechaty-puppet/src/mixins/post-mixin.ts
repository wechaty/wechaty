import {
  log,
}                       from '../config.js'

import type {
  PostPayload,
  PostQueryFilter,
}                                 from '../schemas/post.js'

import type { PuppetSkeleton }    from '../puppet/puppet-skeleton.js'
import { DirtyType }              from '../schemas/dirty.js'

import type {
  PaginationRequest,
  PaginationResponse,
}                                 from '../schemas/pagination.js'

import type { CacheMixin }        from './cache-mixin.js'

const postMixin = <MinxinBase extends typeof PuppetSkeleton & CacheMixin>(baseMixin: MinxinBase) => {

  abstract class PostMixin extends baseMixin {

    constructor (...args: any[]) {
      super(...args)
      log.verbose('PuppetPostMixin', 'constructor()')
    }

    abstract postRawPayload (postId: string)        : Promise<any>
    abstract postRawPayloadParser (rawPayload: any) : Promise<PostPayload>

    postPayloadCache (postId: string): undefined | PostPayload {
      // log.silly('PuppetPostMixin', 'postPayloadCache(id=%s) @ %s', postId, this)
      if (!postId) {
        throw new Error('no id')
      }
      const cachedPayload = this.cache.post.get(postId)
      if (cachedPayload) {
        // log.silly('PuppetPostMixin', 'postPayloadCache(%s) cache HIT', postId)
      } else {
        log.silly('PuppetPostMixin', 'postPayloadCache(%s) cache MISS', postId)
      }

      return cachedPayload
    }

    async postPayload (
      postId: string,
    ): Promise<PostPayload> {
      log.verbose('PuppetPostMixin', 'postPayload(%s)', postId)

      if (!postId) {
        throw new Error('no id')
      }

      /**
       * 1. Try to get from cache first
       */
      const cachedPayload = this.postPayloadCache(postId)
      if (cachedPayload) {
        return cachedPayload
      }

      /**
     * 2. Cache not found
     */
      const rawPayload = await this.postRawPayload(postId)
      const payload    = await this.postRawPayloadParser(rawPayload)

      this.cache.post.set(postId, payload)
      log.silly('PuppetPostMixin', 'postPayload(%s) cache SET', postId)

      return payload
    }

    /**
     * Publish a post
     */
    abstract postPublish (payload: PostPayload): Promise<void | string>

    /**
     * Search from the server.
     *
     * @param postId
     * @param filter
     * @param pagination
     */
    abstract postSearch (
      filter      : PostQueryFilter,
      pagination? : PaginationRequest,
    ): Promise<PaginationResponse<string[]>>

    /**
     * List from the local, will return all ids from cache
     */
    postList (): string[] {
      log.verbose('PuppetPostMixin', 'postList()')
      return [...this.cache.post.keys()]
    }

    async postPayloadDirty (
      id: string,
    ): Promise<void> {
      log.verbose('PuppetPostMixin', 'postPayloadDirty(%s)', id)

      await this.__dirtyPayloadAwait(
        DirtyType.Post,
        id,
      )
    }

  }

  return PostMixin
}

type PostMixin = ReturnType<typeof postMixin>

type ProtectedPropertyPostMixin =
  | 'postPayloadCache'
  | 'postRawPayload'
  | 'postRawPayloadParser'

export type {
  PostMixin,
  ProtectedPropertyPostMixin,
}
export { postMixin }
