import {
  log,
}                       from '../config.js'

import type {
  RoomInvitationPayload,
}                                 from '../schemas/room-invitation.js'

import type { PuppetSkeleton }        from '../puppet/puppet-skeleton.js'
import type { CacheMixin } from './cache-mixin.js'

const roomInvitationMixin = <MixinBase extends typeof PuppetSkeleton & CacheMixin>(mixinBase: MixinBase) => {

  abstract class RoomInvitationMixin extends mixinBase {

    constructor (...args: any[]) {
      super(...args)
      log.verbose('PuppetRoomInvitationMixin', 'constructor()')
    }

    /**
     *
     * Room Invitation
     *
     */

    /**
     * Issue #155 - https://github.com/wechaty/puppet/issues/155
     *
     * @protected
     */
    roomInvitationPayloadCache (
      roomInvitationId: string,
    ): undefined | RoomInvitationPayload {
      // log.silly('PuppetRoomInvitationMixin', 'roomInvitationPayloadCache(id=%s) @ %s', friendshipId, this)
      if (!roomInvitationId) {
        throw new Error('no id')
      }
      const cachedPayload = this.cache.roomInvitation.get(roomInvitationId)

      if (cachedPayload) {
        // log.silly('PuppetRoomInvitationMixin', 'roomInvitationPayloadCache(%s) cache HIT', roomInvitationId)
      } else {
        log.silly('PuppetRoomInvitationMixin', 'roomInvitationPayloadCache(%s) cache MISS', roomInvitationId)
      }

      return cachedPayload
    }

    abstract roomInvitationAccept (roomInvitationId: string): Promise<void>

    /**
     * Issue #155 - https://github.com/wechaty/puppet/issues/155
     *
     * @protected
     */
    abstract roomInvitationRawPayload (roomInvitationId: string) : Promise<any>

    /**
     * Issue #155 - https://github.com/wechaty/puppet/issues/155
     *
     * @protected
     */
    abstract roomInvitationRawPayloadParser (rawPayload: any)    : Promise<RoomInvitationPayload>

    /**
     * Get & Set
     */
    async roomInvitationPayload (roomInvitationId: string)                                    : Promise<RoomInvitationPayload>
    async roomInvitationPayload (roomInvitationId: string, newPayload: RoomInvitationPayload) : Promise<void>

    async roomInvitationPayload (roomInvitationId: string, newPayload?: RoomInvitationPayload): Promise<void | RoomInvitationPayload> {
      log.verbose('PuppetRoomInvitationMixin', 'roomInvitationPayload(%s)', roomInvitationId)

      if (typeof newPayload === 'object') {
        this.cache.roomInvitation.set(roomInvitationId, newPayload)
        return
      }

      /**
       * 1. Try to get from cache first
       */
      const cachedPayload = this.roomInvitationPayloadCache(roomInvitationId)
      if (cachedPayload) {
        return cachedPayload
      }

      /**
       * 2. Cache not found
       */

      const rawPayload = await this.roomInvitationRawPayload(roomInvitationId)
      const payload = await this.roomInvitationRawPayloadParser(rawPayload)

      return payload
    }

  }

  return RoomInvitationMixin
}

type RoomInvitationMixin = ReturnType<typeof roomInvitationMixin>

type ProtectedPropertyRoomInvitationMixin =
  | 'roomInvitationPayloadCache'
  | 'roomInvitationRawPayload'
  | 'roomInvitationRawPayloadParser'

export type {
  RoomInvitationMixin,
  ProtectedPropertyRoomInvitationMixin,
}
export { roomInvitationMixin }
