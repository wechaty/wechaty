/**
 * Tests the generated gRPC health check service: `check` and `watch` over a loopback server.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { promisify } from 'util'

import {
  grpc,
  google,
}             from '../../src/mod.ts'

test('HealthCheck protocol buffer', async _t => {
  const request   = new google.HealthCheckRequest()
  const response  = new google.HealthCheckResponse()
  response.setStatus(google.HealthCheckResponse.ServingStatus.SERVING)
  await assert.ok(request && response, 'should export HealCheck protobuf')
})

test('health check smoke testing', async _t => {

  /**
   * Create Server
   */
  const testServer = getTestServer()

  const server = new grpc.Server()
  server.addService(
    google.HealthService,
    testServer,
  )
  // Port 0: a free port, so test files never share one (Deno runs them in one process).
  const port = await promisify(
    server.bindAsync
      .bind(server)
  )(
    '127.0.0.1:0',
    grpc.ServerCredentials.createInsecure(),
  ) as number
  const ENDPOINT = `127.0.0.1:${port}`

  /**
   * Create Client
   */
  const client = new google.HealthClient(
    ENDPOINT,
    grpc.credentials.createInsecure()
  )

  const request = new google.HealthCheckRequest()
  const response = await promisify(
    client.check
      .bind(client)
  )(request) as any

  assert.equal(response.getStatus(), google.HealthCheckResponse.ServingStatus.SERVING, 'should return SERVING_STATUS_SERVING for check method')

  /**
   * gRPC: Stream
   */
  const eventStream = client.watch(request)

  let counter = 0
  const future = new Promise<void>((resolve, reject) => {
    eventStream
      .on('data', (response: google.HealthCheckResponse) => {
        assert.equal(response.getStatus(), google.HealthCheckResponse.ServingStatus.SERVING, `should return SERVING_STATUS_SERVING for watch method with counter #${counter}`)
        counter++
      })
      .on('close', resolve)
      .on('error', reject)
  })

  await future
  assert.equal(counter, 2, 'should return 2 responses')

  // Close the client before the server, so no HTTP/2 session is left open
  // (wechaty/grpc#130).
  client.close()
  await new Promise(resolve => server.tryShutdown(resolve))
})

function getTestServer () {

  const puppetTestServer: google.IHealthServer = {
    check: (_call, callback) => {
      const response = new google.HealthCheckResponse()
      response.setStatus(google.HealthCheckResponse.ServingStatus.SERVING)
      callback(null, response)
    },
    watch: (call) => {
      const response1 = new google.HealthCheckResponse()
      response1.setStatus(google.HealthCheckResponse.ServingStatus.SERVING)
      call.write(response1)

      const response2 = new google.HealthCheckResponse()
      response2.setStatus(google.HealthCheckResponse.ServingStatus.SERVING)
      call.write(response2)

      call.end()
    },
  }

  return puppetTestServer
}
