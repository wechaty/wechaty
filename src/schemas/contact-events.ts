import { EventEmitter }   from 'events'
import type TypedEventEmitter  from 'typed-emitter'

import type {
  ContactInterface,
  FriendshipInterface,
  MessageInterface,
}                   from '../user-modules/mod.js'

type ContactEventListenerMessage    = (this: ContactInterface, message: MessageInterface, date?: Date)  => void | Promise<void>
type ContactEventListenerFriendship = (friendship: FriendshipInterface)                                 => void | Promise<void>

interface ContactEventListeners {
  friendship : ContactEventListenerFriendship,
  message    : ContactEventListenerMessage,
}

const ContactEventEmitter = EventEmitter as any as new () => TypedEventEmitter<
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
