import { EventEmitter }   from 'wechaty-puppet'
import type * as TypedEventEmitter from 'typed-emitter'

import type {
  Contact,
  Friendship,
  Message,
}                   from '../user-modules/mod.ts'

type ContactEventListenerMessage    = (this: Contact, message: Message, date?: Date)  => void | Promise<void>
type ContactEventListenerFriendship = (friendship: Friendship)                        => void | Promise<void>

interface ContactEventListeners {
  friendship : ContactEventListenerFriendship,
  message    : ContactEventListenerMessage,
}

const ContactEventEmitter = EventEmitter as any as new () => TypedEventEmitter.default<
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
