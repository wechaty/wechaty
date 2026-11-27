/**
 * Tests authentication, error propagation, and lifecycle resiliency
 * between `PuppetServer` and `PuppetService` as part of the Phase 4.1 Safety Net Test Suite (#3123).
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { LifecycleClock } from 'scopelet'
import type { PuppetOptions } from 'wechaty-puppet'
import { PuppetMock } from 'wechaty-puppet-mock'

import { freePort } from '../fixtures/free-port.ts'
import { useTempHome } from '../fixtures/temp-home.ts'

import {
  PuppetService,
  PuppetServer,
  type PuppetServerOptions,
  type PuppetServiceOptions,
} from '../../src/mod.ts'

class ManualClock implements LifecycleClock {

  private currentTime = 0
  private nextId = 1
  private timers = new Map<number, { fireAt: number, fn: () => void }>()

  now (): number {
    return this.currentTime
  }

  setTimeout (fn: () => void, ms: number): unknown {
    const id = this.nextId++
    this.timers.set(id, { fireAt: this.currentTime + Math.max(0, ms), fn })
    return id
  }

  clearTimeout (id: unknown): void {
    if (typeof id === 'number') {
      this.timers.delete(id)
    }
  }

  get pendingCount (): number {
    return this.timers.size
  }

  async advanceBy (ms: number): Promise<void> {
    const target = this.currentTime + ms
    while (true) {
      let nextEntry: [number, { fireAt: number, fn: () => void }] | undefined
      for (const entry of this.timers.entries()) {
        if (entry[1].fireAt <= target && (!nextEntry || entry[1].fireAt < nextEntry[1].fireAt)) {
          nextEntry = entry
        }
      }
      if (!nextEntry) {
        break
      }
      const [id, timer] = nextEntry
      this.timers.delete(id)
      this.currentTime = timer.fireAt
      timer.fn()
      await new Promise(resolve => setImmediate(resolve))
    }
    this.currentTime = target
    await new Promise(resolve => setImmediate(resolve))
  }

}

const VALID_TOKEN_UUID   = '11111111-1111-1111-1111-111111111111'
const INVALID_TOKEN_UUID = '22222222-2222-2222-2222-222222222222'

test('Resiliency and authentication simulation between PuppetService and PuppetServer', async t => {
  useTempHome(t)

  await t.test('rejects connection with mismatched token', async () => {
    const port = await freePort()
    const endpoint = `127.0.0.1:${port}`
    const serverToken = `insecure_${VALID_TOKEN_UUID}`
    const clientToken = `insecure_${INVALID_TOKEN_UUID}`

    let puppet: PuppetMock | undefined
    let server: PuppetServer | undefined
    let client: PuppetService | undefined

    try {
      puppet = new PuppetMock()
      server = new PuppetServer({
        endpoint,
        puppet,
        token: serverToken,
      } as PuppetServerOptions)
      client = new PuppetService({
        endpoint,
        token: clientToken,
      } as PuppetOptions)

      await server.start()
      await assert.rejects(
        async () => client!.start(),
        /UNAUTHENTICATED/i,
        'client should reject with UNAUTHENTICATED when token is invalid',
      )
    } finally {
      await client?.stop().catch(() => {})
      await server?.stop().catch(() => {})
      await puppet?.stop().catch(() => {})
    }
  })

  await t.test('propagates backend puppet error cleanly to client without crashing server', async () => {
    const port = await freePort()
    const endpoint = `127.0.0.1:${port}`
    const token = `insecure_${VALID_TOKEN_UUID}`

    let puppet: PuppetMock | undefined
    let server: PuppetServer | undefined
    let client: PuppetService | undefined

    try {
      puppet = new PuppetMock()
      puppet.contactPayload = async () => {
        throw new Error('simulated backend database failure')
      }

      server = new PuppetServer({
        endpoint,
        puppet,
        token,
      } as PuppetServerOptions)
      client = new PuppetService({
        endpoint,
        token,
      } as PuppetOptions)

      await server.start()
      await client.start()

      // 1. First call fails as expected
      await assert.rejects(
        async () => client!.contactPayload('contact-error-id'),
        /simulated backend database failure/,
        'client call should reject with the backend puppet error message',
      )

      // 2. Server remains alive and serves subsequent requests
      puppet.contactPayload = async (id: string) => ({
        id,
        name: 'Recovered Contact',
      } as any)

      const payload = await client.contactPayload('contact-recovered-id')
      assert.equal(payload.name, 'Recovered Contact', 'server should continue serving after error')
    } finally {
      await client?.stop().catch(() => {})
      await server?.stop().catch(() => {})
      await puppet?.stop().catch(() => {})
    }
  })

  await t.test('clean stop and restart lifecycle on the same port', async () => {
    const port = await freePort()
    const endpoint = `127.0.0.1:${port}`
    const token = `insecure_${VALID_TOKEN_UUID}`

    // 1. First session: start, perform RPC, stop
    let puppet1: PuppetMock | undefined
    let server1: PuppetServer | undefined
    let client1: PuppetService | undefined

    try {
      puppet1 = new PuppetMock()
      server1 = new PuppetServer({
        endpoint,
        puppet: puppet1,
        token,
      } as PuppetServerOptions)
      client1 = new PuppetService({
        endpoint,
        token,
      } as PuppetOptions)

      await server1.start()
      await client1.start()

      assert.ok(client1.isLoggedIn === false, 'client1 should be started')
      const qrCode1 = await client1.contactSelfQRCode()
      assert.ok(typeof qrCode1 === 'string', 'client1 should be operational before stop')
    } finally {
      await client1?.stop().catch(() => {})
      await server1?.stop().catch(() => {})
      await puppet1?.stop().catch(() => {})
    }

    // 2. Second session: rebind to the EXACT same port to verify socket release without EADDRINUSE
    let puppet2: PuppetMock | undefined
    let server2: PuppetServer | undefined
    let client2: PuppetService | undefined

    try {
      puppet2 = new PuppetMock()
      server2 = new PuppetServer({
        endpoint,
        puppet: puppet2,
        token,
      } as PuppetServerOptions)
      client2 = new PuppetService({
        endpoint,
        token,
      } as PuppetOptions)

      await server2.start()
      await client2.start()

      assert.ok(client2.isLoggedIn === false, 'client2 should start cleanly on reused port')
      const qrCode2 = await client2.contactSelfQRCode()
      assert.ok(typeof qrCode2 === 'string', 'client2 should be operational after restart')
    } finally {
      await client2?.stop().catch(() => {})
      await server2?.stop().catch(() => {})
      await puppet2?.stop().catch(() => {})
    }
  })

  await t.test('reconnects after stream loss using injected LifecycleClock', async () => {
    const port = await freePort()
    const endpoint = `127.0.0.1:${port}`
    const token = `insecure_${VALID_TOKEN_UUID}`
    const clock = new ManualClock()

    let puppet: PuppetMock | undefined
    let server: PuppetServer | undefined
    let client: PuppetService | undefined

    try {
      puppet = new PuppetMock()
      server = new PuppetServer({ endpoint, puppet, token })
      client = new PuppetService({
        endpoint,
        token,
        clock,
        reconnect: { baseDelayMs: 1000, maxDelayMs: 4000 },
      } as PuppetServiceOptions)
      client.on('error', () => {})

      await server.start()
      await client.start()
      assert.equal(client.grpcManager.isRunning, true)

      // Drop the server so the event stream ends/errors while running
      await server.stop()
      await client.grpcManager.whenState(s => s.kind === 'starting')
      assert.equal(clock.pendingCount, 1, 'reconnect backoff timer should be scheduled on ManualClock')

      // Bring the server back up on the same port before the backoff expires
      await server.start()

      // Advancing 999ms must not fire the 1000ms reconnect timer yet
      await clock.advanceBy(999)
      assert.equal(client.grpcManager.state.kind, 'starting')

      // Advancing the remaining 1ms triggers reconnect
      await clock.advanceBy(1)
      await client.grpcManager.whenRunning()
      const qrCode = await client.contactSelfQRCode()
      assert.ok(typeof qrCode === 'string', 'client should serve RPCs after reconnect')
    } finally {
      await client?.stop().catch(() => {})
      await server?.stop().catch(() => {})
      await puppet?.stop().catch(() => {})
    }
  })

  await t.test('stop() cancels pending reconnect sleep immediately', async () => {
    const port = await freePort()
    const endpoint = `127.0.0.1:${port}`
    const token = `insecure_${VALID_TOKEN_UUID}`
    const clock = new ManualClock()

    let puppet: PuppetMock | undefined
    let server: PuppetServer | undefined
    let client: PuppetService | undefined

    try {
      puppet = new PuppetMock()
      server = new PuppetServer({ endpoint, puppet, token })
      client = new PuppetService({
        endpoint,
        token,
        clock,
        reconnect: { baseDelayMs: 60_000, maxDelayMs: 60_000 },
      } as PuppetServiceOptions)
      client.on('error', () => {})

      await server.start()
      await client.start()

      await server.stop()
      await client.grpcManager.whenState(s => s.kind === 'starting')
      assert.equal(clock.pendingCount, 1)

      // stop() must resolve immediately without advancing the 60s clock timer
      await client.stop()
      assert.equal(clock.pendingCount, 0, 'stop() should cancel pending reconnect sleep')
      assert.throws(() => client!.grpcManager, /no grpc manager/)
    } finally {
      await client?.stop().catch(() => {})
      await server?.stop().catch(() => {})
      await puppet?.stop().catch(() => {})
    }
  })

  await t.test('stop() is bounded by stopTimeoutMs when remote server is unresponsive', async () => {
    const port = await freePort()
    const endpoint = `127.0.0.1:${port}`
    const token = `insecure_${VALID_TOKEN_UUID}`
    const clock = new ManualClock()

    let puppet: PuppetMock | undefined
    let server: PuppetServer | undefined
    let client: PuppetService | undefined

    try {
      puppet = new PuppetMock()
      server = new PuppetServer({ endpoint, puppet, token })
      client = new PuppetService({
        endpoint,
        token,
        clock,
        stopTimeoutMs: 250,
      } as PuppetServiceOptions)
      client.on('error', () => {})

      await server.start()
      await client.start()

      // Simulate an unresponsive server whose remote stop RPC never settles
      ;(client.grpcManager.client as any).stop = async () => new Promise(() => {})

      const stopPromise = assert.rejects(
        client.stop(),
        (err: any) => err?.code === 'ERR_LIFECYCLE_TIMEOUT' && err?.timeoutMs === 250,
      )
      await new Promise(resolve => setImmediate(resolve))
      await clock.advanceBy(250)
      await stopPromise

      assert.throws(() => client!.grpcManager, /no grpc manager/)
    } finally {
      await client?.stop().catch(() => {})
      await server?.stop().catch(() => {})
      await puppet?.stop().catch(() => {})
    }
  })

  await t.test('shared provider lifecycle scenario runs on PuppetMock and loopback PuppetService', async () => {
    async function runProviderScenario (
      provider: PuppetMock | PuppetService,
      emitEvents: (events: { scan: () => void, login: () => void, ready: () => void, logout: () => void }) => void,
    ) {
      const seen: string[] = []
      provider.on('scan', () => seen.push('scan'))
      provider.on('login', () => seen.push('login'))
      provider.on('ready', () => seen.push('ready'))
      provider.on('logout', () => seen.push('logout'))

      await provider.start()
      assert.equal(provider.isRunning, true)

      const scanDone = new Promise<void>(resolve => provider.once('scan', () => resolve()))
      const loginDone = new Promise<void>(resolve => provider.once('login', () => resolve()))
      const readyDone = new Promise<void>(resolve => provider.once('ready', () => resolve()))
      const logoutDone = new Promise<void>(resolve => provider.once('logout', () => resolve()))

      emitEvents({
        scan: () => provider.emit('scan', { qrcode: 'qr-1', status: 2 }),
        login: () => { void provider.login('self-id') },
        ready: () => provider.emit('ready', { data: 'ready' }),
        logout: () => { void provider.logout('bye') },
      })

      await scanDone
      await loginDone
      await readyDone
      const qr = await provider.contactSelfQRCode()
      assert.equal(typeof qr, 'string')
      await logoutDone

      await provider.stop()
      assert.equal(provider.isStopped, true)
      assert.deepEqual(seen, ['scan', 'login', 'ready', 'logout'])
    }

    // 1. Direct PuppetMock
    const directMock = new PuppetMock()
    try {
      await runProviderScenario(directMock, (e) => {
        e.scan()
        e.login()
        e.ready()
        e.logout()
      })
    } finally {
      await directMock.stop().catch(() => {})
    }

    // 2. Loopback PuppetService -> PuppetServer -> PuppetMock
    const port = await freePort()
    const endpoint = `127.0.0.1:${port}`
    const token = `insecure_${VALID_TOKEN_UUID}`
    const backend = new PuppetMock()
    const server = new PuppetServer({ endpoint, puppet: backend, token })
    const service = new PuppetService({ endpoint, token } as PuppetOptions)
    try {
      await server.start()
      await runProviderScenario(service, () => {
        backend.emit('scan', { qrcode: 'qr-1', status: 2 })
        backend.emit('login', { contactId: 'self-id' })
        backend.emit('ready', { data: 'ready' })
        backend.emit('logout', { contactId: 'self-id', data: 'bye' })
      })
    } finally {
      await service.stop().catch(() => {})
      await server.stop().catch(() => {})
      await backend.stop().catch(() => {})
    }
  })
})
