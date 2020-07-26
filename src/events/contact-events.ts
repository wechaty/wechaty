import { EventEmitter }   from 'events'
import TypedEventEmitter  from 'typed-emitter'

import {
  Contact,
  Friendship,
  Message,
}                   from '../user/mod'

export type ContactMessageEventListener    = (this: Contact, message: Message, date?: Date) => void
export type ContactFriendshipEventListener = (friendship: Friendship)                       => void

interface ContactEvents {
  friendship : ContactFriendshipEventListener,
  message    : ContactMessageEventListener,
}

export const ContactEventEmitter = EventEmitter as new () => TypedEventEmitter<
  ContactEvents
>
