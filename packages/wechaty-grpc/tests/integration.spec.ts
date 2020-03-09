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

  const EXPECTED_DATA_LIST = ['data1', 'data2']
  const ACTUAL_DATA_LIST   = [] as string[]

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
        ACTUAL_DATA_LIST.push(payload)

        console.info('on(data)', payload)

        if (ACTUAL_DATA_LIST.length === EXPECTED_DATA_LIST.length) {
          resolve()
        }
      })
      .on('error', reject)
  })

  /**
   * gRPC: Ding
   */
  await new Promise(resolve => setTimeout(resolve, 100))

  for (const data of EXPECTED_DATA_LIST) {
    const request = new DingRequest()
    request.setData(data)

    console.info('ding() for ', data)
    await util.promisify(client.ding.bind(client))(request)
  }

  /**
   * Check Result
   */
  await future
  t.deepEqual(ACTUAL_DATA_LIST, EXPECTED_DATA_LIST, 'should get ding data back through event stream')

  /**
   * Close Client & Server
   */
  eventStream.cancel()

  await new Promise(resolve => server.tryShutdown(resolve))
  // server.forceShutdown()
})

function getTestServer () {

  let eventStream: undefined | grpc.ServerWritableStream<EventRequest>

  /**
   * Implements the SayHello RPC method.
   */
  const puppetTestServer: IPuppetServer = {
    ...puppetServerImpl,

    ding: (call, callback) => {
      const data = call.request.getData()

      if (!eventStream) {
        throw new Error('eventStream is not created')
      }

      const eventResponse = new EventResponse()
      eventResponse.setType(EventType.EVENT_TYPE_DONG)
      eventResponse.setPayload(data)
      eventStream.write(eventResponse)

      callback(null, new DingResponse())
    },

    event: (streamnigCall) => {
      if (eventStream) {
        throw new Error('eventStream can not be created again')
      }

      eventStream = streamnigCall

      /**
        * Detect if Inexor Core is gone (GRPC disconnects)
        *  https://github.com/grpc/grpc/issues/8117#issuecomment-362198092
        */
      eventStream.on('cancelled', () => console.info('eventStream.on(calcelled)'))
    },

  }

  return puppetTestServer
}
