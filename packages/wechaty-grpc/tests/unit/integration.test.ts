/**
 * Tests a `PuppetClient` against a loopback server: unary `ding` calls and the event stream.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import util from 'util'

import {
  grpc,
  puppet,
}                       from '../../src/mod.ts'

import {
  puppetServerImpl,
}                     from '../fixtures/puppet-server-impl.ts'

test('integration testing', async _t => {

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
  // Port 0: a free port, so test files never share one (Deno runs them in one process).
  const port = await util.promisify(server.bindAsync.bind(server))(
    '127.0.0.1:0',
    grpc.ServerCredentials.createInsecure(),
  ) as number
  const ENDPOINT = `127.0.0.1:${port}`

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
  assert.deepEqual(EVENT_DATA_LIST, DING_DATA_LIST, 'should get ding data back through event stream')

  /**
   * Close Client & Server
   */

  /**
   * Issue #130: Assertion `(current_nghttp2_memory_) >= (previous_size)' failed.
   *  https://github.com/wechaty/grpc/issues/130
   */
  await new Promise<void>(resolve => setImmediate(resolve))
  eventStream.cancel()

  // Close the client before the server, so no HTTP/2 session is left open.
  client.close()
  await new Promise(resolve => server.tryShutdown(resolve))
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
