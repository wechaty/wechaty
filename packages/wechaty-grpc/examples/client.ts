// tslint:disable:no-console
// tslint:disable:max-line-length
// tslint:disable:no-shadowed-variable
// tslint:disable:callable-types

import util from 'util'

import grpc from 'grpc'

import {
  ContactListRequest,
  PuppetClient,
  SelfIdRequest,
  EventRequest,
  EventResponse,
  // EventType,
}                     from '../src/'

/**
 * Issue #7: https://github.com/Chatie/grpc/issues/7
 */
export type Callback<T> = (err: Error | null, reply: T) => void

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

async function main () {
  const client = new PuppetClient(
    'localhost:8788',
    grpc.credentials.createInsecure()
  )

  const contactListRequest = new ContactListRequest()

  const contactList = util.promisify(client.contactList.bind(client))
  const t = await contactList(contactListRequest)
  console.info('contactList:', t.getIdList())

  // client.contactList(contactListRequest, (err, response) => {
  //   if (err) {
  //     console.error(err)
  //     return
  //   }
  //   console.info('contactList:', response.getIdList())
  // })

  // event(request: wechaty_puppet_event_pb.EventRequest, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<wechaty_puppet_event_pb.EventRequest>;
  const eventStream = client.event(new EventRequest())
  eventStream
    .on('data', (chunk: EventResponse) => {
      // console.info('EventType:', EventType)
      // console.info('type:', chunk.getType(), EventType[chunk.getType()], EventType[23])
      console.info('payload:', chunk.getPayload())
      // console.info('eventStream.on(data):', chunk)

      const selfIdRequest = new SelfIdRequest()
      client.selfId(selfIdRequest, (err, response) => {
        if (err) {
          console.error(err)
          return
        }
        console.info('selfId:', response.getId())
      })

    })
    .on('end', () => {
      console.info('eventStream.on(end)')
    })

  return 0
}

main()
  // .then(process.exit)
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
