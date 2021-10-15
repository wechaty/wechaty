import type { Constructor } from 'clone-class'

import type { Puppet } from './mod.js'

/**
 * Mixin: Property 'messageRawPayload' of exported class expression may not be private or protected.ts(4094) #155
 *  https://github.com/wechaty/puppet/issues/155
 *
 * We can not use `private` or `protected` to declare Mixins
 *  So we define a `ProtectedMethods` list to mark the protected methods
 *    And Omit them from the Puppet typing defination
 *    to build a new PuppetInterface
 */
type ProtectedMethods = never
  | 'cacheContactPayload'
  | 'cacheFriendshipPayload'
  | 'cacheMessagePayload'
  | 'cacheRoomPayload'
  | 'cacheRoomMemberPayload'
  | 'cacheRoomInvitationPayload'
  | 'counter'
  | 'memory'
  | 'login'
  | 'contactRawPayload'
  | 'contactRawPayloadParser'
  | 'contactQueryFilterFactory'
  | 'contactPayloadCache'
  | 'friendshipRawPayload'
  | 'friendshipRawPayloadParser'
  | 'friendshipPayloadCache'
  | 'messageRawPayload'
  | 'messageRawPayloadParser'
  | 'messagePayloadCache'
  | 'messageQueryFilterFactory'
  | 'roomInvitationPayloadCache'
  | 'roomInvitationRawPayload'
  | 'roomInvitationRawPayloadParser'
  | 'roomRawPayload'
  | 'roomRawPayloadParser'
  | 'roomMemberRawPayload'
  | 'roomMemberRawPayloadParser'
  | 'roomQueryFilterFactory'
  | 'roomPayloadCache'

// https://stackoverflow.com/questions/44983560/how-to-exclude-a-key-from-an-interface-in-typescript
type PuppetInterface = Omit<Puppet, ProtectedMethods>

type PuppetImplementation = Constructor<PuppetInterface>

export type {
  PuppetImplementation,
  PuppetInterface,
}
