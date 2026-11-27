/**
 * `createMockWorld`: reusable in-memory WeChat simulation world for TCK scenarios.
 *
 * Why this module exists:
 * Provides a pre-wired `Mocker` + `PuppetMock` + seeded human actors (`botUser`,
 * `alice`, `bob`, `room`) with automatic `ready` emission and `t.after()` cleanup
 * so every behavioral test starts with a realistic, isolated WeChat environment.
 */

import * as PUPPET from 'wechaty-puppet'

import { PuppetMock, type PuppetMockOptions } from '../../puppet-mock.ts'
import type { ContactMock, RoomMock } from '../../mock/mod.ts'

/**
 * A seeded in-memory WeChat simulation world.
 */
export interface MockWorld {
  puppet: PuppetMock
  botUser: ContactMock
  alice: ContactMock
  bob: ContactMock
  room: RoomMock
  /** Logs in `botUser` and emits `ready` on `puppet`. */
  loginReady: () => Promise<void>
}

/**
 * Options for `createMockWorld`.
 */
export interface MockWorldOptions extends PuppetMockOptions {
  /**
   * Whether to start, log in, and ready `puppet` immediately.
   * Set to `false` when `Wechaty` owns `puppet.start()`. Defaults to `true`.
   */
  autoStart?: boolean
}

/**
 * Minimal test-context shape compatible with `node:test`'s `TestContext`.
 */
export interface MockWorldTestContext {
  after (fn: () => void | Promise<void>): void
}

/**
 * Creates a seeded `PuppetMock` world, registering `t.after()` cleanup.
 *
 * @param t - Test context (`node:test`) for deterministic teardown.
 * @param options - Optional `MockWorldOptions` overrides.
 * @returns Seeded `MockWorld` (started and logged in when `autoStart !== false`).
 */
export async function createMockWorld (
  t: MockWorldTestContext,
  options: MockWorldOptions = {},
): Promise<MockWorld> {
  const { autoStart = true, ...puppetOptions } = options
  const puppet = new PuppetMock(puppetOptions)
  t.after(async () => {
    await puppet.stop().catch(() => undefined)
  })

  const botUser = puppet.mocker.createContact({ id: 'bot-user', name: 'Bot User' })
  const alice = puppet.mocker.createContact({
    handle: 'alice_wx',
    id: 'alice',
    name: 'Alice',
    phone: ['+15550101'],
  })
  const bob = puppet.mocker.createContact({
    handle: 'bob_wx',
    id: 'bob',
    name: 'Bob',
    phone: ['+15550102'],
  })
  const room = puppet.mocker.createRoom({
    adminIdList: [botUser.id],
    id: 'room@chatroom',
    memberIdList: [botUser.id, alice.id],
    ownerId: botUser.id,
    topic: 'TCK General',
  })

  const loginReady = async (): Promise<void> => {
    puppet.mocker.login(botUser)
    puppet.dispatchEvent(new PUPPET.WechatyEvent('ready', { detail: { data: 'ready' } }))
    await puppet.ready()
  }

  if (autoStart) {
    await puppet.start()
    await loginReady()
  }

  return {
    alice,
    bob,
    botUser,
    loginReady,
    puppet,
    room,
  }
}
