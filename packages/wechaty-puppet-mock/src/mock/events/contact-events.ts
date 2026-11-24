/**
 * The typed `message` event emitter that `ContactMock` extends.
 */
import { EventEmitter }   from 'node:events'
// typed-emitter ships CommonJS types, so NodeNext sees its default export
// under `.default`.
import type * as TypedEventEmitter from 'typed-emitter'

import type {
  ContactMock,
  MessageMock,
}                   from '../user/mod.ts'

export type ContactMessageEventListener = (this: ContactMock, message: MessageMock, date?: Date) => void | Promise<void>

interface ContactEvents {
  message: ContactMessageEventListener,
}

export const ContactEventEmitter = EventEmitter as any as new () => TypedEventEmitter.default<
  ContactEvents
>
