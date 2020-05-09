import { Wechaty } from './wechaty'
import {
  Contact,
  Message,
}           from './user'

export type AnyFunction = (...args: any[]) => any

export interface Sayable {
  id      : string,
  wechaty : Wechaty,
  say (
    text     : string,
    replyTo? : Contact | Contact[]
  ): Promise<void | Message>
}

export interface Acceptable {
  accept: () => Promise<void>
  wechaty: Wechaty
}
