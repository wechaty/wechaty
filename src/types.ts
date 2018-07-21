import {
  Contact,
}           from './user'

export type AnyFunction = (...args: any[]) => any

export interface Sayable {
  say (
    text     : string,
    replyTo? : Contact | Contact[]
  ): Promise<void>
}

export interface Acceptable {
  accept: () => Promise<void>
}
