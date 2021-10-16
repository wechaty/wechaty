import type { Constructor } from 'clone-class'

import type { Puppet } from './mod.js'

/**
 * Issue #155 - Mixin: Property 'messageRawPayload' of exported class expression
 *  may not be private or protected.ts(4094)
 *  @see https://github.com/wechaty/puppet/issues/155
 *
 * We can not use `private` or `protected` to declare Mixins
 *  So we define a `ProtectedMethods` list to mark the protected methods
 *    And Omit them from the Puppet typing defination
 *    to build a new PuppetInterface
 */
type ProtectedProperty = never
  | 'cache'
  | 'counter'
  | 'memory'
  | 'login'
  // Contact
  | 'contactRawPayload'
  | 'contactRawPayloadParser'
  | 'contactQueryFilterFactory'
  | 'contactPayloadCache'
  // Friend
  | 'friendshipRawPayload'
  | 'friendshipRawPayloadParser'
  | 'friendshipPayloadCache'
  // Message
  | 'messagePayloadCache'
  | 'messageQueryFilterFactory'
  | 'messageRawPayload'
  | 'messageRawPayloadParser'
  // Indicator
  | 'resetIndicator'
  // RoomInvitation
  | 'roomInvitationPayloadCache'
  | 'roomInvitationRawPayload'
  | 'roomInvitationRawPayloadParser'
  // RoomMember
  | 'roomMemberRawPayload'
  | 'roomMemberRawPayloadParser'
  // Room
  | 'roomPayloadCache'
  | 'roomQueryFilterFactory'
  | 'roomRawPayload'
  | 'roomRawPayloadParser'

// https://stackoverflow.com/questions/44983560/how-to-exclude-a-key-from-an-interface-in-typescript
type PuppetInterface = Omit<Puppet, ProtectedProperty>

type PuppetImplementation = Constructor<PuppetInterface>

export type {
  ProtectedProperty,
  PuppetImplementation,
  PuppetInterface,
}
