import {
  cacheMixin,
  ProtectedPropertyCacheMixin,
}                                     from '../mixins/cache-mixin.js'
import {
  contactMixin,
  ProtectedPropertyContactMixin,
}                                     from '../mixins/contact-mixin.js'
import {
  friendshipMixin,
  ProtectedPropertyFriendshipMixin,
}                                     from '../mixins/friendship-mixin.js'
import {
  loginMixin,
  ProtectedPropertyLoginMixin,
}                                     from '../mixins/login-mixin.js'
import {
  memoryMixin,
  ProtectedPropertyMemoryMixin,
}                                     from '../mixins/memory-mixin.js'
import {
  messageMixin,
  ProtectedPropertyMessageMixin,
}                                     from '../mixins/message-mixin.js'
import { miscMixin }                  from './misc-mixin.js'
import {
  roomInvitationMixin,
  ProtectedPropertyRoomInvitationMixin,
}                                     from '../mixins/room-invitation-mixin.js'
import {
  roomMemberMixin,
  ProtectedPropertyRoomMemberMixin,
}                                     from '../mixins/room-member-mixin.js'
import {
  roomMixin,
  ProtectedPropertyRoomMixin,
}                                     from '../mixins/room-mixin.js'
import {
  stateMixin,
  ProtectedPropertyStateMixin,
}                                     from '../mixins/state-mixin.js'
import { tagMixin }                   from '../mixins/tag-mixin.js'

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
type PuppetProtectedProperty = never
  | ProtectedPropertyCacheMixin
  | ProtectedPropertyContactMixin
  | ProtectedPropertyFriendshipMixin
  | ProtectedPropertyLoginMixin
  | ProtectedPropertyMemoryMixin
  | ProtectedPropertyMessageMixin
  | ProtectedPropertyRoomInvitationMixin
  | ProtectedPropertyRoomMemberMixin
  | ProtectedPropertyRoomMixin
  | ProtectedPropertyStateMixin

export type {
  PuppetProtectedProperty,
}
export {
  cacheMixin,
  contactMixin,
  friendshipMixin,
  loginMixin,
  memoryMixin,
  messageMixin,
  miscMixin,
  roomInvitationMixin,
  roomMemberMixin,
  roomMixin,
  stateMixin,
  tagMixin,
}
