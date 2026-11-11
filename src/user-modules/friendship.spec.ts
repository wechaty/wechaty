#!/usr/bin/env -S node --import=tsx/esm
import {
  test,
}           from 'tstest'

import * as PUPPET from 'wechaty-puppet'
import {
  PuppetMock,
}           from 'wechaty-puppet-mock'

import {
  WechatyBuilder,
}           from '../wechaty-builder.js'

async function withImmediateTimers<T> (
  callback: () => Promise<T>,
): Promise<T> {
  const originalSetTimeout = globalThis.setTimeout
  const fakeSetTimeout = (
    handler: Parameters<typeof globalThis.setTimeout>[0],
  ): ReturnType<typeof globalThis.setTimeout> => {
    if (typeof handler === 'function') {
      queueMicrotask(() => handler())
    }
    return originalSetTimeout(() => undefined, 0)
  }

  Reflect.set(globalThis, 'setTimeout', fakeSetTimeout)
  try {
    return await callback()
  } finally {
    Reflect.set(globalThis, 'setTimeout', originalSetTimeout)
  }
}

test('accept retries contact synchronization without repeating provider acceptance', async t => {
  const puppet = new PuppetMock()
  const wechaty = WechatyBuilder.build({ puppet })
  wechaty.on('error', () => {})

  const mockContact = puppet.mocker.createContact({ name: 'Friend' })
  await wechaty.start()

  try {
    const friendship = wechaty.Friendship.load('friendship-id')
    friendship.payload = {
      id: 'friendship-id',
      contactId: mockContact.id,
      timestamp: 0,
      ticket: 'ticket',
      type: PUPPET.types.Friendship.Receive,
    }

    let acceptCalls = 0
    puppet.friendshipAccept = async () => {
      acceptCalls++
    }

    const contact = friendship.contact()
    const contactPayload = puppet.contactPayload.bind(puppet)
    let contactPayloadCalls = 0
    puppet.contactPayload = async id => {
      contactPayloadCalls++
      if (contactPayloadCalls < 3) {
        throw new Error('transient contact synchronization failure')
      }
      return contactPayload(id)
    }

    let syncCalls = 0
    contact.sync = async () => {
      syncCalls++
    }

    await withImmediateTimers(() => friendship.accept())

    t.equal(acceptCalls, 1, 'accepts the friendship once before synchronization')
    t.equal(contactPayloadCalls, 3, 'retries contact synchronization until it succeeds')
    t.ok(contact.isReady(), 'leaves the contact ready after synchronization')
    t.equal(syncCalls, 1, 'runs the final contact sync once')
  } finally {
    await wechaty.stop()
  }
})

test('accept emits the final synchronization error and still syncs the contact', async t => {
  const puppet = new PuppetMock()
  const wechaty = WechatyBuilder.build({ puppet })
  const emittedErrors: unknown[] = []
  wechaty.on('error', error => {
    emittedErrors.push(error)
  })

  const mockContact = puppet.mocker.createContact({ name: 'Friend' })
  await wechaty.start()

  try {
    const friendship = wechaty.Friendship.load('friendship-id')
    friendship.payload = {
      id: 'friendship-id',
      contactId: mockContact.id,
      timestamp: 0,
      ticket: 'ticket',
      type: PUPPET.types.Friendship.Receive,
    }

    let acceptCalls = 0
    puppet.friendshipAccept = async () => {
      acceptCalls++
    }

    const finalError = new Error('contact synchronization exhausted')
    const contact = friendship.contact()
    let contactPayloadCalls = 0
    puppet.contactPayload = async () => {
      contactPayloadCalls++
      throw finalError
    }

    let syncCalls = 0
    contact.sync = async () => {
      syncCalls++
    }

    await withImmediateTimers(() => friendship.accept())

    t.equal(acceptCalls, 1, 'does not repeat the provider acceptance')
    t.equal(contactPayloadCalls, 4, 'makes the initial synchronization call plus three retries')
    t.equal(emittedErrors.length, 5, 'emits each contact error and the final acceptance error')
    t.ok(emittedErrors.every(error => error instanceof Error && error.message === finalError.message), 'preserves the final error message')
    t.equal(syncCalls, 1, 'runs the final contact sync after retries are exhausted')
  } finally {
    await wechaty.stop()
  }
})
