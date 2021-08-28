import { EventEmitter }   from 'events'
import type TypedEventEmitter  from 'typed-emitter'

import {
  Contact,
  Friendship,
  Message,
}                   from '../user/mod.js'

export type ContactMessageEventListener    = (this: Contact, message: Message, date?: Date) => void
export type ContactFriendshipEventListener = (friendship: Friendship)                       => void

interface ContactEvents {
  friendship : ContactFriendshipEventListener,
  message    : ContactMessageEventListener,
}

export const ContactEventEmitter = EventEmitter as new () => TypedEventEmitter<
  ContactEvents
>
