import { EventEmitter }   from 'events'
import type TypedEventEmitter  from 'typed-emitter'

import type {
  Contact,
  Friendship,
  Message,
}                   from '../user-modules/mod.js'

type ContactEventListenerMessage    = (this: Contact, message: Message, date?: Date) => void | Promise<void>
type ContactEventListenerFriendship = (friendship: Friendship)                       => void | Promise<void>

interface ContactEventListeners {
  friendship : ContactEventListenerFriendship,
  message    : ContactEventListenerMessage,
}

const ContactEventEmitter = EventEmitter as new () => TypedEventEmitter<
  ContactEventListeners
>

export type {
  ContactEventListeners,
  ContactEventListenerMessage,
  ContactEventListenerFriendship,
}
export {
  ContactEventEmitter,
}
