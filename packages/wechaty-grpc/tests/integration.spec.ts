#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test }  from 'tstest'

import util from 'util'

import {
  grpc,
  puppet,
}                       from '../src/mod.js'

import {
  puppetServerImpl,
}                     from '../tests/puppet-server-impl.js'

test('integration testing', async t => {
  const ENDPOINT = 'localhost:18788'

  const DING_DATA_LIST  = ['data1', 'data2']
  const EVENT_DATA_LIST = [] as string[]

  /**
   * Create Server
   */
  const testServer = getTestServer()

  const server = new grpc.Server()
  server.addService(
    puppet.PuppetService,
    testServer,
  )
  await util.promisify(server.bindAsync.bind(server))(
    ENDPOINT,
    grpc.ServerCredentials.createInsecure(),
  )
  server.start()

  /**
   * Create Client
   */
  const client = new puppet.PuppetClient(
    ENDPOINT,
    grpc.credentials.createInsecure()
  )

  /**
   * gRPC: Stream
   */
  const eventStream = client.event(new puppet.EventRequest())

  const future = new Promise<void>((resolve, reject) => {
    eventStream
      .on('data', (chunk: puppet.EventResponse) => {
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
    const request = new puppet.DingRequest()
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

  /**
   * Issue #130: Assertion `(current_nghttp2_memory_) >= (previous_size)' failed.
   *  https://github.com/wechaty/grpc/issues/130
   */
  await new Promise<void>(resolve => setImmediate(resolve))
  eventStream.cancel()

  await new Promise(resolve => server.tryShutdown(resolve))
  // server.forceShutdown()
})

function getTestServer () {

  let eventStream: undefined | grpc.ServerWritableStream<puppet.EventRequest, puppet.EventResponse>
  const dataQueue = [] as string[]

  /**
   * Implements the SayHello RPC method.
   */
  const puppetTestServer: puppet.IPuppetServer = {
    ...puppetServerImpl,

    ding: (call, callback) => {
      const data = call.request.getData()

      if (!eventStream) {
        dataQueue.push(data)
      } else {
        const eventResponse = new puppet.EventResponse()
        eventResponse.setType(puppet.EventType.EVENT_TYPE_DONG)
        eventResponse.setPayload(data)
        eventStream.write(eventResponse)
      }

      callback(null, new puppet.DingResponse())
    },

    event: (streamingCall) => {
      if (eventStream) {
        throw new Error('eventStream can not be created again')
      }

      eventStream = streamingCall
      while (dataQueue.length > 0) {
        const data = dataQueue.shift()
        const eventResponse = new puppet.EventResponse()
        eventResponse.setType(puppet.EventType.EVENT_TYPE_DONG)
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
