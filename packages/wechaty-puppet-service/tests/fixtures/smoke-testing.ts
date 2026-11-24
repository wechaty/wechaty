/**
 * Smoke test for the packed tarball (run by scripts/npm-pack-testing.sh in a
 * temporary ESM project): a PuppetServer serves a PuppetMock over gRPC on a
 * loopback port, a PuppetService client connects with an insecure token and
 * gets `dong` back for its `ding`, and the embedded version is the real one.
 */
import assert from 'node:assert/strict'
import net from 'node:net'

import { PuppetMock } from 'wechaty-puppet-mock'
import {
  PuppetServer,
  PuppetService,
  VERSION,
}                 from 'wechaty-puppet-service'

assert.notEqual(VERSION, '0.0.0', 'version should not be 0.0.0 when prepared for publishing')

const probe = net.createServer()
await new Promise<void>(resolve => probe.listen(0, '127.0.0.1', resolve))
const { port } = probe.address() as net.AddressInfo
await new Promise<void>(resolve => probe.close(() => resolve()))

const endpoint = `127.0.0.1:${port}`
const token    = 'insecure_00000000-0000-0000-0000-000000000000'

const server = new PuppetServer({ endpoint, puppet: new PuppetMock(), token })
await server.start()

const service = new PuppetService({ endpoint, token })
await service.start()

const dong = new Promise<string | undefined>(resolve => service.once('dong', payload => resolve(payload.data)))
service.ding('smoke')
assert.equal(await dong, 'smoke', 'should get dong back from the server over gRPC')

await service.stop()
await server.stop()
console.info(`PuppetService v${service.version()} smoke testing passed.`)
