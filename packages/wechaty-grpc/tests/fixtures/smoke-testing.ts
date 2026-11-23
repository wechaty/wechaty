/**
 * Smoke test for the packed tarball (run by scripts/npm-pack-testing.sh in a
 * temporary ESM project): the generated stubs load from the published `dist/`,
 * a client and server complete one `ding` call over loopback, the bundled
 * `puppet.proto` is readable, and the embedded version is the real one.
 */
import assert from 'node:assert/strict'
import { promisify } from 'node:util'

import {
  grpc,
  proto,
  puppet,
  VERSION,
}                           from 'wechaty-grpc'

assert.notEqual(VERSION, '0.0.0', 'version should be set before publishing')
assert.match(proto.puppet.v0.data, /service Puppet/, 'puppet.proto should be bundled')

const server = new grpc.Server()
server.addService(puppet.PuppetService, {
  ding: (call: grpc.ServerUnaryCall<puppet.DingRequest, puppet.DingResponse>, callback: grpc.sendUnaryData<puppet.DingResponse>) => {
    assert.equal(call.request.getData(), 'smoke')
    callback(null, new puppet.DingResponse())
  },
} as any)
const port = await promisify(server.bindAsync.bind(server))('127.0.0.1:0', grpc.ServerCredentials.createInsecure())

const client = new puppet.PuppetClient(`127.0.0.1:${port}`, grpc.credentials.createInsecure())
const request = new puppet.DingRequest()
request.setData('smoke')
await promisify(client.ding.bind(client))(request)

client.close()
await new Promise(resolve => server.tryShutdown(resolve))

console.info(`wechaty-grpc v${VERSION} smoking test passed.`)
