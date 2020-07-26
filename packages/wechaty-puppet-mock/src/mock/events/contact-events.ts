import { EventEmitter }   from 'events'
import TypedEventEmitter  from 'typed-emitter'

import {
  ContactMock,
  MessageMock,
}                   from '../user/mod'

export type ContactMessageEventListener = (this: ContactMock, message: MessageMock, date?: Date) => void

interface ContactEvents {
  message    : ContactMessageEventListener,
}

export const ContactEventEmitter = EventEmitter as new () => TypedEventEmitter<
  ContactEvents
>
