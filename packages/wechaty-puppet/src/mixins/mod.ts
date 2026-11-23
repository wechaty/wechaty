/**
 * Barrel for every puppet mixin and its `ProtectedProperty*` type, composed in
 * this order by `puppet-abstract.ts`.
 */
import {
  cacheMixin,
  type ProtectedPropertyCacheMixin,
}                                     from './cache-mixin.ts'
import {
  contactMixin,
  type ProtectedPropertyContactMixin,
}                                     from './contact-mixin.ts'
import {
  friendshipMixin,
  type ProtectedPropertyFriendshipMixin,
}                                     from './friendship-mixin.ts'
import {
  loginMixin,
  type ProtectedPropertyLoginMixin,
}                                     from './login-mixin.ts'
import {
  memoryMixin,
  type ProtectedPropertyMemoryMixin,
}                                     from './memory-mixin.ts'
import {
  messageMixin,
  type ProtectedPropertyMessageMixin,
}                                     from './message-mixin.ts'
import { miscMixin }                  from './misc-mixin.ts'
import {
  readyMixin,
}                                     from './ready-mixin.ts'
import {
  roomInvitationMixin,
  type ProtectedPropertyRoomInvitationMixin,
}                                     from './room-invitation-mixin.ts'
import {
  roomMemberMixin,
  type ProtectedPropertyRoomMemberMixin,
}                                     from './room-member-mixin.ts'
import {
  roomMixin,
  type ProtectedPropertyRoomMixin,
}                                     from './room-mixin.ts'
import {
  serviceMixin,
  type ProtectedPropertyServiceMixin,
}                                     from './service-mixin.ts'
import {
  tagMixin,
  type ProtectedPropertyTagMixin,
}                                     from './tag-mixin.ts'
import {
  tapMixin,
  type ProtectedPropertyTapMixin,
}                                     from './tap-mixin.ts'
import {
  postMixin,
  type ProtectedPropertyPostMixin,
}                                     from './post-mixin.ts'
import {
  sayableMixin,
  type ProtectedPropertySayableMixin,
}                                     from '../mixins/sayable-mixin.ts'
import {
  validateMixin,
  type ProtectedPropertyValidateMixin,
}                                     from './validate-mixin.ts'

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
type MixinProtectedProperty =
  | ProtectedPropertyCacheMixin
  | ProtectedPropertyContactMixin
  | ProtectedPropertyFriendshipMixin
  | ProtectedPropertyLoginMixin
  | ProtectedPropertyMemoryMixin
  | ProtectedPropertyMessageMixin
  | ProtectedPropertyPostMixin
  | ProtectedPropertyRoomInvitationMixin
  | ProtectedPropertyRoomMemberMixin
  | ProtectedPropertyRoomMixin
  | ProtectedPropertyServiceMixin
  | ProtectedPropertyTagMixin
  | ProtectedPropertyTapMixin
  | ProtectedPropertySayableMixin
  | ProtectedPropertyValidateMixin

export {
  type MixinProtectedProperty,
  cacheMixin,
  contactMixin,
  friendshipMixin,
  loginMixin,
  memoryMixin,
  messageMixin,
  miscMixin,
  postMixin,
  readyMixin,
  roomInvitationMixin,
  roomMemberMixin,
  roomMixin,
  serviceMixin,
  tagMixin,
  tapMixin,
  sayableMixin,
  validateMixin,
}
