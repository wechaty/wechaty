import {
  cacheMixin,
  ProtectedPropertyCacheMixin,
}                                     from './cache-mixin.js'
import {
  contactMixin,
  ProtectedPropertyContactMixin,
}                                     from './contact-mixin.js'
import {
  friendshipMixin,
  ProtectedPropertyFriendshipMixin,
}                                     from './friendship-mixin.js'
import {
  loginMixin,
  ProtectedPropertyLoginMixin,
}                                     from './login-mixin.js'
import {
  memoryMixin,
  ProtectedPropertyMemoryMixin,
}                                     from './memory-mixin.js'
import {
  messageMixin,
  ProtectedPropertyMessageMixin,
}                                     from './message-mixin.js'
import { miscMixin }                  from './misc-mixin.js'
import {
  readyMixin,
}                                     from './ready-mixin.js'
import {
  roomInvitationMixin,
  ProtectedPropertyRoomInvitationMixin,
}                                     from './room-invitation-mixin.js'
import {
  roomMemberMixin,
  ProtectedPropertyRoomMemberMixin,
}                                     from './room-member-mixin.js'
import {
  roomMixin,
  ProtectedPropertyRoomMixin,
}                                     from './room-mixin.js'
import {
  serviceMixin,
  ProtectedPropertyServiceMixin,
}                                     from './service-mixin.js'
import {
  tagMixin,
  ProtectedPropertyTagMixin,
}                                     from './tag-mixin.js'
import {
  tapMixin,
  ProtectedPropertyTapMixin,
}                                     from './tap-mixin.js'
import {
  postMixin,
  ProtectedPropertyPostMixin,
}                                     from './post-mixin.js'
import {
  sayableMixin,
  ProtectedPropertySayableMixin,
}                                     from '../mixins/sayable-mixin.js'
import {
  validateMixin,
  ProtectedPropertyValidateMixin,
}                                     from './validate-mixin.js'

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
