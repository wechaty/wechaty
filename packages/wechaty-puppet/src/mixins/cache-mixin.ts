import {
  timeoutPromise,
}                           from 'gerror'

import { log }  from '../config.js'

import type {
  PuppetOptions,
  EventDirtyPayload,
}                               from '../schemas/mod.js'
import { DirtyType }          from '../schemas/mod.js'

import { CacheAgent }           from '../agents/mod.js'

import type { PuppetSkeleton }   from '../puppet/mod.js'

import type { LoginMixin } from './login-mixin.js'

/**
 *
 * Huan(202111) Issue #158 - Refactoring the 'dirty' event, dirtyPayload(),
 *  and XXXPayloadDirty() methods logic & spec
 *
 *    @see https://github.com/wechaty/puppet/issues/158
 *
 */
const cacheMixin = <MixinBase extends typeof PuppetSkeleton & LoginMixin>(mixinBase: MixinBase) => {

  abstract class CacheMixin extends mixinBase {

    cache: CacheAgent

    __cacheMixinCleanCallbackList: (() => void)[]

    constructor (...args: any[]) {
      super(...args)
      log.verbose('PuppetCacheMixin', 'constructor(%s)',
        args[0]?.cache
          ? '{ cache: ' + JSON.stringify(args[0].cache) + ' }'
          : '',
      )

      const options: PuppetOptions = args[0] || {}

      this.__cacheMixinCleanCallbackList = []
      this.cache = new CacheAgent(options.cache)
    }

    override async start (): Promise<void> {
      log.verbose('PuppetCacheMixin', 'start()')
      await super.start()
      this.cache.start()

      const onDirty = this.onDirty.bind(this)

      this.on('dirty', onDirty)
      log.verbose('PuppetCacheMixin', 'start() "dirty" event listener added')

      const cleanFn = () => {
        this.off('dirty', onDirty)
        log.verbose('PuppetCacheMixin', 'start() "dirty" event listener removed')
      }
      this.__cacheMixinCleanCallbackList.push(cleanFn)
    }

    override async stop (): Promise<void> {
      log.verbose('PuppetCacheMixin', 'stop()')
      this.cache.stop()

      this.__cacheMixinCleanCallbackList.map(setImmediate)
      this.__cacheMixinCleanCallbackList.length = 0

      await super.stop()
    }

    /**
     *
     * @windmemory(202008): add dirty payload methods
     *
     *  @see https://github.com/wechaty/grpc/pull/79
     *
     * Call this method when you want to notify the server that the data cache need to be invalidated.
     */
    dirtyPayload (
      type : DirtyType,
      id   : string,
    ): void {
      log.verbose('PuppetCacheMixin', 'dirtyPayload(%s<%s>, %s)', DirtyType[type], type, id)

      /**
       * Huan(202111): we return first before emit the `dirty` event?
       */
      setImmediate(() => this.emit('dirty', {
        payloadId   : id,
        payloadType : type,
      }))
    }

    /**
     * OnDirty will be registered as a `dirty` event listener,
     *  and it will invalidate the cache.
     */
    onDirty (
      {
        payloadType,
        payloadId,
      }: EventDirtyPayload,
    ): void {
      log.verbose('PuppetCacheMixin', 'onDirty(%s<%s>, %s)', DirtyType[payloadType], payloadType, payloadId)

      const dirtyFuncMap = {
        [DirtyType.Contact]:      (id: string) => this.cache.contact.delete(id),
        [DirtyType.Friendship]:   (id: string) => this.cache.friendship.delete(id),
        [DirtyType.Message]:      (id: string) => this.cache.message.delete(id),
        [DirtyType.Post]:         (id: string) => this.cache.post.delete(id),
        [DirtyType.Room]:         (id: string) => this.cache.room.delete(id),
        [DirtyType.RoomMember]:   (id: string) => this.cache.roomMember.delete(id),
        [DirtyType.Unspecified]:  (id: string) => { throw new Error('Unspecified type with id: ' + id) },
      }

      const dirtyFunc = dirtyFuncMap[payloadType]
      dirtyFunc(payloadId)
    }

    /**
     * When we are using PuppetService, the `dirty` event will be emitted from the server,
     *  and we need to wait for the `dirty` event so we can make sure the cache has been invalidated.
     */
    async __dirtyPayloadAwait (
      type : DirtyType,
      id   : string,
    ): Promise<void> {
      log.verbose('PuppetCacheMixin', '__dirtyPayloadAwait(%s<%s>, %s)', DirtyType[type], type, id)

      if (!this.__currentUserId) {
        log.verbose('PuppetCacheMixin', '__dirtyPayloadAwait() will not dirty any payload when the puppet is not logged in')
        return
      }

      const isCurrentDirtyEvent = (event: EventDirtyPayload) =>
        event.payloadId === id && event.payloadType === type

      const onDirtyResolve = (resolve: () => void) => {
        const onDirty = (event: EventDirtyPayload) => {
          if (isCurrentDirtyEvent(event)) {
            resolve()
          }
        }
        return onDirty
      }

      let onDirty: ReturnType<typeof onDirtyResolve>

      const future = new Promise<void>(resolve => {
        onDirty = onDirtyResolve(resolve)
        this.on('dirty', onDirty)
      })

      /**
       * 1. call for sending the `dirty` event
       */
      this.dirtyPayload(type, id)

      /**
       * 2. wait for the `dirty` event arrive, with a 5 seconds timeout
       */
      try {
        await timeoutPromise(future, 5 * 1000)
          .finally(() => this.off('dirty', onDirty))

      } catch (e) {
        // timeout, log warning & ignore it
        log.warn('PuppetCacheMixin',
          [
            '__dirtyPayloadAwait() timeout.',
            'The `dirty` event should be received but no one found.',
            'Learn more from https://github.com/wechaty/puppet/issues/158',
            'payloadType: %s(%s)',
            'payloadId: %s',
            'error: %s',
            'stack: %s',
          ].join('\n  '),
          DirtyType[type],
          type,
          id,
          (e as Error).message,
          (e as Error).stack,
        )
      }

      /**
       * Huan(202111): wait for all the taks in the event loop queue to be executed
       *  before we return, because there might be other `onDirty` listeners
       */
      await new Promise(setImmediate)

    }

  }

  return CacheMixin
}

type CacheMixin = ReturnType<typeof cacheMixin>

type ProtectedPropertyCacheMixin =
  | 'cache'
  | 'onDirty'
  | '__cacheMixinCleanCallbackList'
  | '__dirtyPayloadAwait'

export type {
  CacheMixin,
  ProtectedPropertyCacheMixin,
}
export { cacheMixin }
