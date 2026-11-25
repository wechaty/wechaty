/**
 * Browser consumer smoke test fixture for packed Wechaty monorepo packages.
 *
 * Why this module exists:
 * Verifies that the published npm tarballs of Wechaty monorepo packages (such as `scopelet`
 * and `wechaty-grpc`) work cleanly in an external consumer project running in a headless
 * browser (Chromium) without depending on monorepo workspace links, internal TypeScript
 * source resolution (`wechaty-source`), or injected Node.js runtime globals.
 *
 * Architectural boundaries:
 * Executes strictly inside a headless browser tab managed by Modern Web Test Runner.
 * It imports only published package exports, standard Web APIs, and external dependencies.
 * Top-level imports of Node built-ins (`node:*`) and reliance on Node globals (`process`,
 * `Buffer`, `setImmediate`) are strictly forbidden and will fail execution.
 *
 * Relationships:
 * - `scripts/pack-browser-test.sh`: Installs tarballs and compiles/executes this suite.
 * - `scripts/fixtures/web-test-runner.consumer.config.js`: WTR configuration serving this test.
 * - Issue #3107: Add a packed-package browser consumer test under Epic #3104.
 */

// Ambient declarations for BDD test primitives injected by the browser test harness.
declare const describe: (name: string, fn: () => void) => void
declare const it: (name: string, fn: () => void | Promise<void>) => void

import {
  createLifecycle,
  operation,
  VERSION as SCOPELET_VERSION,
} from 'scopelet'
import type { LifecycleScope } from 'scopelet'

import {
  Puppet,
  EventResponseSchema,
  EventType,
  VERSION as GRPC_VERSION,
} from 'wechaty-grpc'

import {
  create,
  toBinary,
  fromBinary,
} from '@bufbuild/protobuf'

import { FileBox } from 'file-box'
import { FileBox as FileBoxBrowser } from 'file-box/browser'

import {
  WechatyBuilder,
  ScanStatus,
  VERSION as WECHATY_VERSION,
} from 'wechaty/browser'
import {
  PuppetMock,
  mock,
  VERSION as PUPPET_MOCK_VERSION,
} from 'wechaty-puppet-mock'

/**
 * Asserts that a condition is truthy, throwing a descriptive Error if falsy.
 *
 * @param condition - The expression to evaluate.
 * @param message - Descriptive failure message.
 * @throws Error if condition is falsy.
 */
function assert (condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

describe('packed browser consumer smoke suite', () => {
  it('validates node globals are NOT injected into browser runtime', () => {
    // Accidental injection of Node polyfills (e.g. rollup-plugin-node-polyfills) must be prevented
    assert(
      typeof (globalThis as Record<string, unknown>)['process'] === 'undefined',
      'Node.js "process" global must not be injected in browser consumer environment',
    )
    assert(
      typeof (globalThis as Record<string, unknown>)['Buffer'] === 'undefined',
      'Node.js "Buffer" global must not be injected in browser consumer environment',
    )
    assert(
      typeof (globalThis as Record<string, unknown>)['setImmediate'] === 'undefined',
      'Node.js "setImmediate" global must not be injected in browser consumer environment',
    )

    // Standard web APIs must be present
    assert(typeof window !== 'undefined', 'Browser window must be defined')
    assert(typeof CustomEvent !== 'undefined', 'Browser CustomEvent must be defined')
    assert(typeof Uint8Array !== 'undefined', 'Standard Uint8Array must be defined')
    assert(typeof atob === 'function', 'Standard atob function must be defined')
  })

  it('runs scopelet lifecycle state machine natively in chromium', async () => {
    assert(Boolean(SCOPELET_VERSION), 'scopelet must export a non-empty VERSION')
    assert(
      SCOPELET_VERSION !== '0.0.0',
      'scopelet VERSION must be populated with the release version, not 0.0.0',
    )

    let savedScope: LifecycleScope | undefined
    const lifecycle = createLifecycle({
      onStart (scope) {
        savedScope = scope
      },
    })

    // Initial state before start
    assert(
      (lifecycle.state.kind as string) === 'stopped',
      `Expected initial state to be 'stopped', got '${lifecycle.state.kind}'`,
    )

    await lifecycle.start()
    assert(
      lifecycle.state.kind === 'running',
      `Expected state after start to be 'running', got '${lifecycle.state.kind}'`,
    )
    assert(Boolean(savedScope), 'onStart hook must provide a LifecycleScope')

    // Execute an async operation guarded by the active lifecycle scope
    const operationResult = await operation(savedScope!, () => 42)
    assert(
      operationResult === 42,
      `Expected operation result 42, got ${operationResult}`,
    )

    await lifecycle.stop()
    assert(
      (lifecycle.state.kind as string) === 'stopped',
      `Expected state after stop to be 'stopped', got '${lifecycle.state.kind}'`,
    )
  })

  it('exercises wechaty-grpc puppet descriptor and protobuf-es v2 round-trip in chromium', () => {
    assert(Boolean(GRPC_VERSION), 'wechaty-grpc must export a non-empty VERSION')
    assert(
      GRPC_VERSION !== '0.0.0',
      'wechaty-grpc VERSION must be populated with the release version, not 0.0.0',
    )

    // Verify service descriptor definition
    assert(
      Puppet.typeName === 'wechaty.Puppet',
      `Expected Puppet.typeName to be 'wechaty.Puppet', got '${Puppet.typeName}'`,
    )

    // Exercise Protobuf-ES v2 binary serialization and deserialization
    const originalEvent = create(EventResponseSchema, {
      type: EventType.MESSAGE,
      payload: '{"smoke":"packed-browser-consumer"}',
    })

    const binaryData = toBinary(EventResponseSchema, originalEvent)
    assert(binaryData instanceof Uint8Array, 'toBinary must produce a Uint8Array')
    assert(binaryData.byteLength > 0, 'Serialized binary protobuf data must be non-empty')

    const deserializedEvent = fromBinary(EventResponseSchema, binaryData)
    assert(
      deserializedEvent.type === EventType.MESSAGE,
      `Event type mismatch: expected ${EventType.MESSAGE}, got ${deserializedEvent.type}`,
    )
    assert(
      deserializedEvent.payload === '{"smoke":"packed-browser-consumer"}',
      `Payload mismatch: expected '{"smoke":"packed-browser-consumer"}', got '${deserializedEvent.payload}'`,
    )
  })

  it('loads and operates file-box root and /browser exports in chromium', () => {
    // 1. Root export (WinterTC condition resolves web-platform mod.js)
    const box1 = FileBox.fromBase64('d2VjaGF0eQ==', 'root-sample.txt')
    assert(
      box1.name === 'root-sample.txt',
      `Expected box1.name to be 'root-sample.txt', got '${box1.name}'`,
    )

    // 2. Explicit /browser subpath export
    const box2 = FileBoxBrowser.fromBase64('d2VjaGF0eQ==', 'browser-sample.txt')
    assert(
      box2.name === 'browser-sample.txt',
      `Expected box2.name to be 'browser-sample.txt', got '${box2.name}'`,
    )
  })

  it('runs a local mock bot via wechaty/browser and PuppetMock natively in Chromium (#3108)', async () => {
    assert(Boolean(WECHATY_VERSION), 'wechaty/browser must export a non-empty VERSION')
    assert(
      WECHATY_VERSION !== '0.0.0',
      'wechaty/browser VERSION must be populated with the release version, not 0.0.0',
    )
    assert(Boolean(PUPPET_MOCK_VERSION), 'wechaty-puppet-mock must export a non-empty VERSION')
    assert(
      PUPPET_MOCK_VERSION !== '0.0.0',
      'wechaty-puppet-mock VERSION must be populated with the release version, not 0.0.0',
    )

    const mocker = new mock.Mocker()
    const puppet = new PuppetMock({ mocker })
    const bot = WechatyBuilder.build({ name: 'smoke-bot', puppet })

    const [user, player] = mocker.createContacts(2) as [any, any]

    let scanned = false as boolean
    let loggedIn = false as boolean
    let readyFired = false as boolean
    let dongReceived = false as boolean
    const replies: string[] = []

    // Official Wechaty 2.0 WinterTC EventTarget interface with CustomEvent
    bot.addEventListener('error', (event: any) => {
      console.error('bot error:', event.detail)
    })

    bot.addEventListener('scan', (event: any) => {
      const { qrcode, status } = event.detail
      if (status === ScanStatus.Waiting && Boolean(qrcode)) {
        scanned = true
      }
    })

    bot.addEventListener('login', (event: any) => {
      const contact = event.detail
      if (contact.id === user.id) {
        loggedIn = true
      }
    })

    bot.addEventListener('ready', () => {
      readyFired = true
    })

    bot.addEventListener('dong', (event: any) => {
      if (event.detail === 'ping-test') {
        dongReceived = true
      }
    })

    bot.addEventListener('message', async (event: any) => {
      const msg = event.detail
      if (msg.text() === 'ding') {
        await msg.say('dong')
        replies.push('dong')
      }
    })

    // Test native AbortSignal listener cancellation on standard EventTarget
    const abortController = new AbortController()
    let abortableCallCount = 0
    bot.addEventListener(
      'message',
      (event: any) => {
        if (event.detail?.text?.() === 'ding') {
          abortableCallCount++
        }
      },
      { signal: abortController.signal },
    )

    // 1. Start bot and verify initial state
    await bot.start()
    assert(!bot.isLoggedIn, 'Bot must not be logged in before login event')

    // 2. Scan event propagation
    mocker.scan('https://wechaty.js.org/qrcode/test', ScanStatus.Waiting)
    assert(scanned, 'Scan event must be received by bot')

    // 3. Login event and readiness
    mocker.login(user)
    for (let i = 0; i < 20 && !loggedIn; i++) {
      await new Promise(r => setTimeout(r, 50))
    }
    assert(loggedIn, 'Login event must be received by bot')
    assert(Boolean(bot.isLoggedIn), 'bot.isLoggedIn must be true after login')

    puppet.emit('ready', { data: 'ready' })
    await bot.ready()
    assert(readyFired, 'Ready event must be fired upon bot readiness')

    // 4. Ding-Dong text message round-trip
    player.say('ding').to(user)
    for (let i = 0; i < 20 && replies.length === 0; i++) {
      await new Promise(r => setTimeout(r, 50))
    }
    assert(
      (replies.length as number) === 1 && replies[0] === 'dong',
      `Bot must reply "dong" to "ding", received: ${JSON.stringify(replies)}`,
    )
    assert(abortableCallCount === 1, 'Abortable listener must receive first message')

    // Abort the message listener and verify it receives no further emissions
    abortController.abort()
    player.say('ding').to(user)
    for (let i = 0; i < 20 && replies.length === 1; i++) {
      await new Promise(r => setTimeout(r, 50))
    }
    assert((replies.length as number) === 2, 'Bot must reply to second message')
    assert(abortableCallCount === 1, 'Aborted listener must not receive further messages')

    // 5. Heartbeat / ping-pong via bot.ding()
    bot.ding('ping-test')
    for (let i = 0; i < 20 && !dongReceived; i++) {
      await new Promise(r => setTimeout(r, 50))
    }
    assert(dongReceived, 'Bot must handle ding/dong ping-pong')

    // 6. Stop and inspect event listener count persistence
    const messageListenersBefore = puppet.listenerCount('message')
    assert(messageListenersBefore > 0, 'Puppet must have message listeners attached')

    await bot.stop()
    assert(!bot.isLoggedIn, 'Bot must not be logged in after stop')

    // 7. Restart and assert no duplicate listeners were registered
    await bot.start()
    const messageListenersAfter = puppet.listenerCount('message')
    assert(
      messageListenersAfter === messageListenersBefore,
      `Listener count must not increase on restart (before: ${messageListenersBefore}, after: ${messageListenersAfter})`,
    )

    await bot.stop()
  })
})
