#!/usr/bin/env -S node --import=tsx/esm
import * as PUPPET from 'wechaty-puppet'
import { PuppetMock } from 'wechaty-puppet-mock'
import {
  test,
} from 'tstest'

import type {
  ContactInterface,
  ContactSelfInterface,
  FriendshipInterface,
  MessageInterface,
  RoomInterface,
} from '../user-modules/mod.js'
import type {
  WechatyEventListeners,
  WechatyEventName,
} from '../schemas/wechaty-events.js'
import {
  registerPuppetEventBridge,
} from './puppet-event-bridge.js'

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
    roomInvitationLoad: () => ({} as unknown as Parameters<Dependencies['emit']>[1]),
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

test('registers every puppet event once and keeps reset unhandled', async t => {
  const puppet = new PuppetMock()
  const { dependencies } = createBridgeTestContext()
  const eventNameList = Object.keys(PUPPET.types.PUPPET_EVENT_DICT) as PUPPET.types.PuppetEventName[]
  const listenerCountList = eventNameList.map(event => puppet.listenerCount(event))

  registerPuppetEventBridge(puppet, dependencies)

  for (const [index, event] of eventNameList.entries()) {
    const expectedDelta = event === 'reset' ? 0 : 1
    t.equal(
      puppet.listenerCount(event) - listenerCountList[index]!,
      expectedDelta,
      `should register ${event} intentionally`,
    )
  }
})

test('message event hydrates then forwards the same object in order', async t => {
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

  t.same(trace, ['bot:message', 'room:message'], 'should emit to the bot before forwarding to the room')
  t.equal(context.eventList[0]?.args[0], message, 'should forward the hydrated message object')
})

test('message hydration failures are forwarded as errors without emitting messages', async t => {
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

  t.equal(context.errorList.length, 2, 'should forward missing and rejected hydration errors')
  t.same(context.eventList, [], 'should not emit messages when hydration fails')
})

test('login, friendship, and room-join handlers preserve their event forwarding', async t => {
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

  t.ok(context.eventList.some(({ event, args }) => event === 'login' && args[0] === contactSelf), 'should emit login contact')
  t.ok(context.eventList.some(({ event, args }) => event === 'friendship' && args[0] === friendship), 'should emit loaded friendship')
  t.ok(context.trace.indexOf('bot:friendship') < context.trace.indexOf('contact:friendship'), 'should emit friendship before contact forwarding')
  t.ok(context.trace.indexOf('bot:room-join') < context.trace.indexOf('room:join'), 'should emit room-join before room forwarding')
})

test('ready and scan events update readiness and emit in order', async t => {
  const puppet = new PuppetMock()
  const context = createBridgeTestContext()

  registerPuppetEventBridge(puppet, context.dependencies)
  puppet.emit('ready', { data: 'test' })
  puppet.emit('scan', {
    qrcode: 'qrcode',
    status: PUPPET.types.ScanStatus.Waiting,
    data: 'scan-data',
  })

  t.same(context.trace, [
    'bot:ready',
    'ready:active',
    'ready:inactive',
    'bot:scan',
  ], 'should update readiness around corresponding bot events')
})
