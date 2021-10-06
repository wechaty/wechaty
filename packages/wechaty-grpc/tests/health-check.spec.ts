#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test }  from 'tstest'

import { promisify } from 'util'

import {
  grpc,
  google,
}             from '../src/mod.js'

test('HealthCheck protocol buffer', async t => {
  const request   = new google.HealthCheckRequest()
  const response  = new google.HealthCheckResponse()
  response.setStatus(google.HealthCheckResponse.ServingStatus.SERVING)
  await t.ok(request && response, 'should export HealCheck protobuf')
})

test('health check smoke testing', async t => {
  const ENDPOINT = 'localhost:18788'

  /**
   * Create Server
   */
  const testServer = getTestServer()

  const server = new grpc.Server()
  server.addService(
    google.HealthService,
    testServer,
  )
  await promisify(
    server.bindAsync
      .bind(server)
  )(
    ENDPOINT,
    grpc.ServerCredentials.createInsecure(),
  )
  server.start()

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

  t.equal(response.getStatus(), google.HealthCheckResponse.ServingStatus.SERVING, 'should return SERVING_STATUS_SERVING for check method')

  /**
   * gRPC: Stream
   */
  const eventStream = client.watch(request)

  let counter = 0
  const future = new Promise<void>((resolve, reject) => {
    eventStream
      .on('data', (response: google.HealthCheckResponse) => {
        t.equal(response.getStatus(), google.HealthCheckResponse.ServingStatus.SERVING, `should return SERVING_STATUS_SERVING for watch method with counter #${counter}`)
        counter++
      })
      .on('close', resolve)
      .on('error', reject)
  })

  await future
  t.equal(counter, 2, 'should return 2 responses')

  await new Promise(resolve => server.tryShutdown(resolve))
  // server.forceShutdown()
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
