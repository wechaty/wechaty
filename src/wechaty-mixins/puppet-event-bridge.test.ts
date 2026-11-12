#!/usr/bin/env -S node --import=tsx/esm
import * as PUPPET from 'wechaty-puppet'
import { PuppetMock } from 'wechaty-puppet-mock'
import assert from 'node:assert/strict'
import { test } from 'node:test'

import type {
  ContactInterface,
  ContactSelfInterface,
  FriendshipInterface,
  MessageInterface,
  RoomInvitationInterface,
  RoomInterface,
}                                             from '../user-modules/mod.ts'
import type {
  WechatyEventListeners,
  WechatyEventName,
}                                             from '../schemas/wechaty-events.ts'
import {
  registerPuppetEventBridge,
} from './puppet-event-bridge.ts'

type Dependencies = Parameters<typeof registerPuppetEventBridge>[1]

function createBridgeTestContext (
  overrides: Partial<Dependencies> = {},
) {
  const trace: string[] = []
  const eventList: { event: WechatyEventName, args: unknown[] }[] = []
  const errorList: Error[] = []

  const dependencies: Dependencies = {
    contactFind: async () => undefined,
    contactReady: async () => {},
    contactSelfFind: async () => undefined,
    friendshipLoad: () => ({} as unknown as FriendshipInterface),
    messageFind: async () => undefined,
    postFind: async () => undefined,
    roomFind: async () => undefined,
    roomInvitationLoad: () => ({} as unknown as RoomInvitationInterface),
    roomReady: async () => {},
    setReady: state => trace.push(`ready:${state}`),
    emit: function <EventName extends WechatyEventName> (
      event: EventName,
      ...args: Parameters<WechatyEventListeners[EventName]>
    ) {
      trace.push(`bot:${event}`)
      eventList.push({ event, args })
      return true
    },
    emitError: error => errorList.push(error),
    ...overrides,
  }

  return {
    dependencies,
    errorList,
    eventList,
    trace,
  }
}

async function flushEvents (): Promise<void> {
  await new Promise<void>(resolve => setImmediate(resolve))
}

test('registers every puppet event once and keeps reset unhandled', async () => {
  const puppet = new PuppetMock()
  const { dependencies } = createBridgeTestContext()
  const eventNameList = Object.keys(PUPPET.types.PUPPET_EVENT_DICT) as PUPPET.types.PuppetEventName[]
  const listenerCountList = eventNameList.map(event => puppet.listenerCount(event))

  registerPuppetEventBridge(puppet, dependencies)

  for (const [index, event] of eventNameList.entries()) {
    const expectedDelta = event === 'reset' ? 0 : 1
    assert.equal(
      puppet.listenerCount(event) - listenerCountList[index]!,
      expectedDelta,
      `should register ${event} intentionally`,
    )
  }
})

test('message event hydrates then forwards the same object in order', async () => {
  const puppet = new PuppetMock()
  const trace: string[] = []
  const room = {
    emit: (event: string) => trace.push(`room:${event}`),
  } as unknown as RoomInterface
  const message = {
    room: () => room,
    listener: () => undefined,
  } as unknown as MessageInterface
  const context = createBridgeTestContext({
    messageFind: async () => message,
    emit: function <EventName extends WechatyEventName> (
      event: EventName,
      ...args: Parameters<WechatyEventListeners[EventName]>
    ) {
      trace.push(`bot:${event}`)
      context.eventList.push({ event, args })
      return true
    },
  })

  registerPuppetEventBridge(puppet, context.dependencies)
  puppet.emit('message', { messageId: 'message-id' })
  await flushEvents()

  assert.deepEqual(trace, ['bot:message', 'room:message'], 'should emit to the bot before forwarding to the room')
  assert.equal(context.eventList[0]?.args[0], message, 'should forward the hydrated message object')
})

test('message event forwards to a listener contact when it has no room', async () => {
  const puppet = new PuppetMock()
  const trace: string[] = []
  const listener = {
    emit: (event: string) => trace.push(`contact:${event}`),
  } as unknown as ContactInterface
  const message = {
    room: () => undefined,
    listener: () => listener,
  } as unknown as MessageInterface
  const context = createBridgeTestContext()
  context.dependencies.messageFind = async () => message
  context.dependencies.emit = function <EventName extends WechatyEventName> (
    event: EventName,
    ...args: Parameters<WechatyEventListeners[EventName]>
  ) {
    trace.push(`bot:${event}`)
    context.eventList.push({ event, args })
    return true
  }

  registerPuppetEventBridge(puppet, context.dependencies)
  puppet.emit('message', { messageId: 'message-id' })
  await flushEvents()

  assert.deepEqual(trace, ['bot:message', 'contact:message'], 'should forward to the listener contact after the bot event')
  assert.equal(context.eventList[0]?.args[0], message, 'should forward the same hydrated message object')
})

test('message hydration failures are forwarded as errors without emitting messages', async () => {
  const puppet = new PuppetMock()
  const context = createBridgeTestContext({
    messageFind: async id => {
      if (id === 'throws') {
        throw new Error('lookup failed')
      }
      return undefined
    },
  })

  registerPuppetEventBridge(puppet, context.dependencies)
  puppet.emit('message', { messageId: 'missing' })
  puppet.emit('message', { messageId: 'throws' })
  await flushEvents()

  assert.equal(context.errorList.length, 2, 'should forward missing and rejected hydration errors')
  assert.deepEqual(context.eventList, [], 'should not emit messages when hydration fails')
})

test('login, friendship, and room-join handlers preserve their event forwarding', async () => {
  const puppet = new PuppetMock()
  const context = createBridgeTestContext()
  const contact = {
    emit: (event: string) => context.trace.push(`contact:${event}`),
  } as unknown as ContactInterface
  const contactSelf = {} as ContactSelfInterface
  const friendship = {
    ready: async () => {},
    contact: () => contact,
  } as unknown as FriendshipInterface
  const room = {
    sync: async () => {},
    emit: (event: string) => context.trace.push(`room:${event}`),
  } as unknown as RoomInterface
  context.dependencies.contactSelfFind = async () => contactSelf
  context.dependencies.friendshipLoad = () => friendship
  context.dependencies.roomFind = async () => room
  context.dependencies.contactFind = async () => contact

  registerPuppetEventBridge(puppet, context.dependencies)
  puppet.emit('login', { contactId: 'self-id' })
  puppet.emit('friendship', { friendshipId: 'friendship-id' })
  puppet.emit('room-join', {
    roomId: 'room-id',
    inviteeIdList: ['invitee-id'],
    inviterId: 'inviter-id',
    timestamp: 1,
  })
  await flushEvents()

  assert.ok(context.eventList.some(({ event, args }) => event === 'login' && args[0] === contactSelf), 'should emit login contact')
  assert.ok(context.eventList.some(({ event, args }) => event === 'friendship' && args[0] === friendship), 'should emit loaded friendship')
  assert.ok(context.trace.indexOf('bot:friendship') < context.trace.indexOf('contact:friendship'), 'should emit friendship before contact forwarding')
  assert.deepEqual(context.trace.filter(event => event === 'bot:room-join' || event === 'room:join'), ['bot:room-join', 'room:join'], 'should emit room-join before room forwarding')
})

test('ready and scan events update readiness and emit in order', async () => {
  const puppet = new PuppetMock()
  const context = createBridgeTestContext()

  registerPuppetEventBridge(puppet, context.dependencies)
  puppet.emit('ready', { data: 'test' })
  puppet.emit('scan', {
    qrcode: 'qrcode',
    status: PUPPET.types.ScanStatus.Waiting,
    data: 'scan-data',
  })

  assert.deepEqual(context.trace, [
    'bot:ready',
    'ready:active',
    'ready:inactive',
    'bot:scan',
  ], 'should update readiness around corresponding bot events')
})
