#!/usr/bin/env ts-node

import { test }  from 'tstest'

import util from 'util'
import grpc from 'grpc'

import {
  EventResponse,
  EventType,
  DingResponse,
  IPuppetServer,
  PuppetService,

  PuppetClient,
  DingRequest,
  EventRequest,
}                       from '../src/index'

import {
  puppetServerImpl,
}                     from '../tests/puppet-server-impl'

test('integration testing', async (t) => {
  const ENDPOINT = 'localhost:18788'

  const DING_DATA_LIST  = ['data1', 'data2']
  const EVENT_DATA_LIST = [] as string[]

  /**
   * Create Server
   */
  const testServer = getTestServer()

  const server = new grpc.Server()
  server.addService(
    PuppetService,
    testServer,
  )
  server.bind(ENDPOINT, grpc.ServerCredentials.createInsecure())
  server.start()

  /**
   * Create Client
   */
  const client = new PuppetClient(
    ENDPOINT,
    grpc.credentials.createInsecure()
  )

  /**
   * gRPC: Stream
   */
  const eventStream = client.event(new EventRequest())

  const future = new Promise((resolve, reject) => {
    eventStream
      .on('data', (chunk: EventResponse) => {
        const payload = chunk.getPayload()
        EVENT_DATA_LIST.push(payload)

        console.info('on(data)', payload)

        if (EVENT_DATA_LIST.length === DING_DATA_LIST.length) {
          resolve()
        }
      })
      .on('error', reject)
  })

  /**
   * gRPC: Ding
   */
  for (const data of DING_DATA_LIST) {
    const request = new DingRequest()
    request.setData(data)

    console.info('ding() for ', data)
    await util.promisify(client.ding.bind(client))(request)
  }

  /**
   * Check Result
   */
  await future
  t.deepEqual(EVENT_DATA_LIST, DING_DATA_LIST, 'should get ding data back through event stream')

  /**
   * Close Client & Server
   */
  eventStream.cancel()

  await new Promise(resolve => server.tryShutdown(resolve))
  // server.forceShutdown()
})

function getTestServer () {

  let eventStream: undefined | grpc.ServerWritableStream<EventRequest>
  const dataQueue = [] as string[]

  /**
   * Implements the SayHello RPC method.
   */
  const puppetTestServer: IPuppetServer = {
    ...puppetServerImpl,

    ding: (call, callback) => {
      const data = call.request.getData()

      if (!eventStream) {
        dataQueue.push(data)
      } else {
        const eventResponse = new EventResponse()
        eventResponse.setType(EventType.EVENT_TYPE_DONG)
        eventResponse.setPayload(data)
        eventStream.write(eventResponse)
      }

      callback(null, new DingResponse())
    },

    event: (streamingCall) => {
      if (eventStream) {
        throw new Error('eventStream can not be created again')
      }

      eventStream = streamingCall
      while (dataQueue.length > 0) {
        const data = dataQueue.shift()
        const eventResponse = new EventResponse()
        eventResponse.setType(EventType.EVENT_TYPE_DONG)
        eventResponse.setPayload(data!)
        eventStream.write(eventResponse)
      }
      /**
        * Detect if Inexor Core is gone (GRPC disconnects)
        *  https://github.com/grpc/grpc/issues/8117#issuecomment-362198092
        */
      eventStream.on('cancelled', () => console.info('eventStream.on(calcelled)'))
    },

  }

  return puppetTestServer
}
