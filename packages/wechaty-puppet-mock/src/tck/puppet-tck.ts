/**
 * Puppet Technology Compatibility Kit (`runPuppetTCK`) — Executable SPI Contract Suites.
 *
 * Why this module exists:
 * Defines the canonical black-box contract suites (Lifecycle & State Transitions,
 * Domain & Resource Compliance, Event Stream & DTO Purity, and Cooperative Cancellation)
 * for any `wechaty-puppet` provider, aligned with wechaty/wechaty#3211.
 *
 * Architectural boundaries:
 * Uses only `node:test`, `node:assert/strict`, and `wechaty-puppet` + WinterTC Web Standards
 * (`AbortController`, `AbortSignal`) so it runs identically on Node.js 26 and Deno 2.9.8.
 */

import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import * as PUPPET from 'wechaty-puppet'

/**
 * Configuration for running the Puppet TCK against a provider implementation.
 */
export interface PuppetTCKOptions {
  /** Human-readable provider name shown in test suite output. */
  name: string
  /** Factory creating a fresh puppet instance for each test case. */
  createPuppet: (options?: PUPPET.PuppetOptions) => PUPPET.Puppet
  /**
   * Optional factory creating a puppet whose `onStart()` hangs until its
   * `AbortSignal` fires or `stop()` is called, used to verify `C-DEADLOCK-01`.
   * May return `{ puppet, entered }` so the test awaits entry into `onStart()`
   * before calling `stop()`.
   */
  createHangingPuppet?: (options?: PUPPET.PuppetOptions) =>
    | PUPPET.Puppet
    | { puppet: PUPPET.Puppet; entered?: Promise<void> }
  /**
   * Optional setup hook invoked after `start()` to seed at least one contact,
   * room, and logged-in user for domain compliance checks (`Suite 2`).
   */
  seedDomain?: (puppet: PUPPET.Puppet) => Promise<{
    userId: string
    contactId: string
    roomId: string
  }>
}

/**
 * Registers the 4 Puppet TCK contract suites using `node:test` against the
 * supplied puppet factory.
 *
 * @param options - Provider name, puppet factory, and optional hooks.
 */
export function runPuppetTCK (options: PuppetTCKOptions): void {
  const { name, createPuppet, createHangingPuppet, seedDomain } = options
  const withWatchdog = async <T>(promise: Promise<T>, label: string, timeoutMs = 3_000): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      return await Promise.race([
        promise,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs)
        }),
      ])
    } finally {
      if (timer !== undefined) clearTimeout(timer)
    }
  }

  describe(`Puppet TCK: ${name}`, () => {
    /**
     * Suite 1: Lifecycle & State Transitions
     */
    describe('Suite 1: Lifecycle & State Transitions', () => {
      test('C-START-01 & C-STOP-01: start() commits running and stop() unwinds cleanly', async (t) => {
        const puppet = createPuppet()
        t.after(async () => {
          await puppet.stop().catch(() => undefined)
        })

        assert.equal(puppet.isStopped, true, 'new puppet starts in stopped state')
        await puppet.start()
        assert.equal(puppet.isRunning, true, 'puppet reaches running state after start()')

        await puppet.stop()
        assert.equal(puppet.isStopped, true, 'puppet returns to stopped state after stop()')
      })

      test('C-RESTART-01: restart() transitions running -> stopping -> starting -> running', async (t) => {
        const puppet = createPuppet()
        t.after(async () => {
          await puppet.stop().catch(() => undefined)
        })

        await puppet.start()
        assert.equal(puppet.isRunning, true)

        await puppet.restart()
        assert.equal(puppet.isRunning, true, 'puppet is running after restart()')
      })

      test('C-COND-01: ready() and isLoggedIn reset across generations', async (t) => {
        const puppet = createPuppet()
        t.after(async () => {
          await puppet.stop().catch(() => undefined)
        })

        const preStartReady = puppet.ready()
        await puppet.start()
        if (seedDomain) {
          await seedDomain(puppet)
        } else {
          (puppet as unknown as { login (userId: string): void }).login('tck-user')
          puppet.dispatchEvent(new PUPPET.WechatyEvent('ready', { detail: { data: 'ready' } }))
        }
        await preStartReady
        assert.equal(puppet.isLoggedIn, true, 'logged in during first generation')

        await puppet.stop()
        assert.equal(puppet.isLoggedIn, false, 'isLoggedIn resets after stop()')

        const nextGenReady = puppet.ready()
        await puppet.start()
        if (seedDomain) {
          await seedDomain(puppet)
        } else {
          (puppet as unknown as { login (userId: string): void }).login('tck-user')
          puppet.dispatchEvent(new PUPPET.WechatyEvent('ready', { detail: { data: 'ready' } }))
        }
        await nextGenReady
        assert.equal(puppet.isLoggedIn, true, 'ready() settles on second generation')
      })

      if (createHangingPuppet) {
        test('C-DEADLOCK-01: stop() unblocks a hanging onStart() without deadlocking', { timeout: 5_000 }, async (t) => {
          const created = createHangingPuppet()
          const puppet = 'puppet' in created ? created.puppet : created
          const entered = 'puppet' in created ? created.entered : undefined

          t.after(async () => {
            await withWatchdog(puppet.stop().catch(() => undefined), 'C-DEADLOCK-01 cleanup')
          })

          const startPromise = puppet.start().catch((err: unknown) => err)
          if (entered) {
            await withWatchdog(entered, 'onStart() entry barrier')
          }
          await withWatchdog(puppet.stop(), 'puppet.stop()')
          const result = await withWatchdog(startPromise, 'puppet.start()')

          assert.ok(result instanceof Error || result === undefined, 'start() settles on stop()')
          assert.equal(puppet.isStopped, true, 'puppet reaches stopped state without deadlocking')
        })
      }
    })

    /**
     * Suite 2: Domain & Resource Compliance
     */
    if (seedDomain) {
      describe('Suite 2: Domain & Resource Compliance', () => {
        test('C-CONTACTS-01 & C-CONTACTS-02: contactList() and contactPayload() contract', async (t) => {
          const puppet = createPuppet()
          t.after(async () => {
            await puppet.stop().catch(() => undefined)
          })

          await puppet.start()
          const { contactId } = await seedDomain(puppet)

          const ids = await puppet.contactList()
          assert.ok(Array.isArray(ids), 'contactList() returns an array')
          assert.ok(ids.includes(contactId), 'contactList() includes seeded contactId')

          const payload = await puppet.contactPayload(contactId)
          assert.equal(payload.id, contactId, 'contactPayload() returns matching id')
          assert.equal(typeof payload.name, 'string', 'contactPayload().name is a string')

          await assert.rejects(
            () => puppet.contactPayload('non-existent-contact-id'),
            'unknown contactId rejects cleanly',
          )
        })

        test('C-ROOMS-01 & C-ROOMS-02: roomPayload() and roomAdd/roomDel symmetry', async (t) => {
          const puppet = createPuppet()
          t.after(async () => {
            await puppet.stop().catch(() => undefined)
          })

          await puppet.start()
          const { roomId, contactId } = await seedDomain(puppet)

          const room = await puppet.roomPayload(roomId)
          assert.equal(room.id, roomId, 'roomPayload() returns matching id')

          await puppet.roomAdd(roomId, contactId)
          const afterAdd = await puppet.roomMemberList(roomId)
          assert.ok(afterAdd.includes(contactId), 'roomAdd() adds contact to roomMemberList()')

          await puppet.roomDel(roomId, contactId)
          const afterDel = await puppet.roomMemberList(roomId)
          assert.equal(afterDel.includes(contactId), false, 'roomDel() removes contact from roomMemberList()')
        })

        test('C-MESSAGES-01: messageSendText() returns a non-empty string messageId', async (t) => {
          const puppet = createPuppet()
          t.after(async () => {
            await puppet.stop().catch(() => undefined)
          })

          await puppet.start()
          const { contactId } = await seedDomain(puppet)

          const messageId = await puppet.messageSendText(contactId, 'tck-ping')
          assert.equal(typeof messageId, 'string', 'messageSendText() returns a string')
          assert.ok((messageId as string).length > 0, 'messageSendText() returns a non-empty messageId')
        })
      })
    }

    /**
     * Suite 3: Event Stream & DTO Purity
     */
    describe('Suite 3: Event Stream & DTO Purity', () => {
      test('C-EVENT-01: error events emit serializable error payloads', async (t) => {
        const puppet = createPuppet()
        t.after(async () => {
          await puppet.stop().catch(() => undefined)
        })

        await puppet.start()
        const errorFuture = puppet.next('error')
        puppet.dispatchEvent(new PUPPET.WechatyEvent('error', {
          detail: { data: 'tck-error-dto', gerror: JSON.stringify({ message: 'tck-error' }) },
        }))

        const detail = await errorFuture
        assert.doesNotThrow(() => JSON.stringify(detail), 'error detail is JSON-serializable')
      })

      test('C-EVENT-02: scan events carry valid ScanStatus transitions', async (t) => {
        const puppet = createPuppet()
        t.after(async () => {
          await puppet.stop().catch(() => undefined)
        })

        await puppet.start()
        const seen: PUPPET.types.ScanStatus[] = []
        puppet.addEventListener('scan', ({ detail }) => {
          seen.push(detail.status)
        })

        for (const status of [
          PUPPET.types.ScanStatus.Waiting,
          PUPPET.types.ScanStatus.Scanned,
          PUPPET.types.ScanStatus.Confirmed,
        ]) {
          puppet.dispatchEvent(new PUPPET.WechatyEvent('scan', {
            detail: { qrcode: 'https://wechaty.js.org/qrcode/tck', status },
          }))
        }

        assert.deepEqual(seen, [
          PUPPET.types.ScanStatus.Waiting,
          PUPPET.types.ScanStatus.Scanned,
          PUPPET.types.ScanStatus.Confirmed,
        ])
      })

      if (seedDomain) {
        test('C-EVENT-03: dirty invalidation fires before updated payload reads', async (t) => {
          const puppet = createPuppet()
          t.after(async () => {
            await puppet.stop().catch(() => undefined)
          })

          await puppet.start()
          const { contactId } = await seedDomain(puppet)
          await puppet.contactPayload(contactId)

          const dirtyFuture = puppet.next('dirty')
          await puppet.contactAlias(contactId, 'tck-updated-alias')
          const dirty = await withWatchdog(dirtyFuture, 'C-EVENT-03 dirty event')
          assert.equal(dirty.payloadType, PUPPET.types.Payload.Contact)
          assert.equal(dirty.payloadId, contactId)

          const refreshed = await puppet.contactPayload(contactId)
          assert.equal(refreshed.alias, 'tck-updated-alias')
        })
      }
    })

    /**
     * Suite 4: Cooperative Cancellation Invariants
     */
    describe('Suite 4: Cooperative Cancellation Invariants', () => {
      test('C-CANCEL-01: pre-aborted AbortSignal rejects immediately', async (t) => {
        const puppet = createPuppet()
        t.after(async () => {
          await puppet.stop().catch(() => undefined)
        })

        await puppet.start()
        const reason = new Error('tck-pre-aborted')
        const signal = AbortSignal.abort(reason)

        await assert.rejects(
          () => puppet.next('message', { signal }),
          (err: unknown) => err === reason,
          'next() rejects with signal.reason',
        )

        await assert.rejects(
          () => puppet.ready({ signal }),
          (err: unknown) => err === reason,
          'ready() rejects with signal.reason',
        )
      })

      test('C-CANCEL-02: stop() drains active operations and rejects post-stop operations', async (t) => {
        const puppet = createPuppet()
        t.after(async () => {
          await puppet.stop().catch(() => undefined)
        })

        await puppet.start()

        let inFlightFinished = false
        let resolveGate!: () => void
        const gate = new Promise<void>((resolve) => {
          resolveGate = resolve
        })

        const opPromise = puppet.operation(async () => {
          await gate
          inFlightFinished = true
          return 'drained'
        })

        const stopPromise = puppet.stop()
        assert.equal(inFlightFinished, false, 'stop() waits for in-flight operation()')

        resolveGate()
        assert.equal(await opPromise, 'drained')
        await stopPromise

        await assert.rejects(
          () => puppet.operation(async () => 'should-fail'),
          'detached operation() after stop() rejects',
        )
      })
    })
  })
}
