import { EventEmitter }   from 'events'
import type TypedEventEmitter  from 'typed-emitter'

import type {
  Contact,
  Friendship,
  Message,
}                   from '../user/mod.js'

type ContactMessageEventListener    = (this: Contact, message: Message, date?: Date) => void | Promise<void>
type ContactFriendshipEventListener = (friendship: Friendship)                       => void | Promise<void>

interface ContactEvents {
  friendship : ContactFriendshipEventListener,
  message    : ContactMessageEventListener,
}

const ContactEventEmitter = EventEmitter as new () => TypedEventEmitter<
  ContactEvents
>

export type {
  ContactMessageEventListener,
  ContactFriendshipEventListener,
}
export {
  ContactEventEmitter,
}
