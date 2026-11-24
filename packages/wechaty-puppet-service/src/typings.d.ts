/**
 * Issue #7: https://github.com/Chatie/grpc/issues/7
 */
export type Callback<T, E extends Error = any> = (err: E | null, reply: T) => void

export type PromisifyOne<T extends any[]> =
    T extends [Callback<infer U>?] ? () => Promise<U> :
    T extends [infer T1, Callback<infer P>?] ? (arg1: T1) => Promise<P> :
    T extends [infer T1, infer T2, Callback<infer U>?] ? (arg1: T1, arg2: T2) => Promise<U> :
    T extends [infer T1, infer T2, infer T3, Callback<infer U>?]? (arg1: T1, arg2: T2, arg3: T3) => Promise<U> :
    T extends [infer T1, infer T2, infer T3, infer T4, Callback<infer U>?] ? (arg1: T1, arg2: T2, arg3: T3, arg4: T4) => Promise<U> :
    never

// prettier-ignore
export type GetOverloadArgs<T> =
    T extends {
      (...o: infer U) : void,
      (...o: infer U2) : void,
      (...o: infer U3) : void,
      (...o: infer U4) : void,
      (...o: infer U5) : void,
      (...o: infer U6) : void,
      (...o: infer U7) : void
    } ? U | U2 | U3 | U4 | U5 | U6 | U7:
    T extends {
      (...o: infer U) : void,
      (...o: infer U2) : void,
      (...o: infer U3) : void,
      (...o: infer U4) : void,
      (...o: infer U5) : void,
      (...o: infer U6) : void,
    } ? U | U2 | U3 | U4 | U5 | U6:
    T extends {
      (...o: infer U) : void,
      (...o: infer U2) : void,
      (...o: infer U3) : void,
      (...o: infer U4) : void,
      (...o: infer U5) : void,
    } ? U | U2 | U3 | U4 | U5:
    T extends {
      (...o: infer U) : void,
      (...o: infer U2) : void,
      (...o: infer U3) : void,
      (...o: infer U4) : void,
    } ? U | U2 | U3 | U4 :
    T extends {
      (...o: infer U) : void,
      (...o: infer U2) : void,
      (...o: infer U3) : void,
    } ? U | U2 | U3 :
    T extends {
      (...o: infer U) : void,
      (...o: infer U2) : void,
    } ? U | U2 :
    T extends {
      (...o: infer U) : void,
    } ? U :
    never

export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never

export type Promisify<T> = UnionToIntersection<
    PromisifyOne<GetOverloadArgs<T>>
>

declare module 'util' {
  function promisify<T> (fn: T): Promisify<T>
}
