import assert from 'node:assert/strict'
import { setImmediate } from 'node:timers/promises'
import { test } from 'node:test'

import type { Wechaty } from 'wechaty'
import type { ContactSelf, Message } from 'wechaty/users'
import { MessageImpl, WechatyImpl } from 'wechaty/impls'
import type { PuppetMock } from 'wechaty-puppet-mock'

import { runExample as startup, type Exercise } from '../../examples/canonical/startup.js'
import { runExample as messageReply } from '../../examples/canonical/message-reply.js'
import { runExample as pluginCleanup } from '../../examples/canonical/plugin-cleanup.js'

function inspectBot (bot: Wechaty) {
  assert.ok(WechatyImpl.validInstance(bot))
  return bot
}

function waitForEvent<T> (
  subscribe: (listener: (value: T) => void) => void,
  unsubscribe: (listener: (value: T) => void) => void,
) {
  return new Promise<T>((resolve, reject) => {
    const listener = (value: T) => {
      clearTimeout(timer)
      unsubscribe(listener)
      resolve(value)
    }
    const timer = setTimeout(() => {
      unsubscribe(listener)
      reject(new Error('Timed out waiting for mock event'))
    }, 5000)
    subscribe(listener)
  })
}

async function login (bot: Wechaty, puppet: PuppetMock) {
  const user = puppet.mocker.createContact({ id: 'bot', name: 'Bot' })
  const sender = puppet.mocker.createContact({ id: 'sender', name: 'Sender' })
  const loggedIn = waitForEvent<ContactSelf>(
    listener => { bot.on('login', listener) },
    listener => { bot.off('login', listener) },
  )
  puppet.mocker.login(user)
  await loggedIn
  return { user, sender }
}

async function nextMessage (bot: Wechaty) {
  const message = await waitForEvent<Message>(
    listener => { bot.on('message', listener) },
    listener => { bot.off('message', listener) },
  )
  assert.ok(MessageImpl.valid(message), 'public implementation recognizes the emitted message')
  return message
}

test('startup registers errors and always shuts down', async () => {
  let stopped = false
  let savedBot: ReturnType<typeof inspectBot> | undefined
  await startup(async (bot, puppet) => {
    savedBot = inspectBot(bot)
    assert.equal(bot.puppet, puppet)
    assert.equal(puppet.state.active(), true)
    assert.equal(savedBot.listenerCount('error'), 1)
    bot.once('stop', () => { stopped = true })
  })
  assert.equal(stopped, true)
  assert.equal(savedBot?.listenerCount('error'), 0)
})

test('startup reports emitted errors and cleans up on failure', async () => {
  let stopped = false
  let savedBot: ReturnType<typeof inspectBot> | undefined
  await assert.rejects(startup(async bot => {
    savedBot = inspectBot(bot)
    bot.once('stop', () => { stopped = true })
    bot.emitError(new Error('example failure'))
  }), (error: unknown) => {
    assert.ok(error instanceof AggregateError)
    assert.equal(error.errors[0].message, 'example failure')
    return true
  })
  assert.equal(stopped, true)
  assert.equal(savedBot?.listenerCount('error'), 0)
})

const exchange: Exercise = async (bot, puppet) => {
  const { user, sender } = await login(bot, puppet)
  const delivered: string[] = []
  const record = (message: { text: () => string }) => { delivered.push(message.text()) }
  bot.on('message', record)
  try {
    const inbound = nextMessage(bot)
    sender.say('ding').to(user)
    const message = await inbound
    assert.equal(message.text(), 'ding')
    assert.equal(message.talker().id, sender.id)
    assert.equal(message.self(), false)

    // The reply follows the inbound event asynchronously through the provider.
    await setImmediate()
    const outgoing = [...puppet.mocker.cacheMessagePayload.values()]
      .filter(payload => payload.talkerId === user.id)
    assert.deepEqual(outgoing.map(payload => ({
      listenerId: payload.listenerId,
      text: payload.text,
    })), [{ listenerId: sender.id, text: 'dong' }])
    assert.deepEqual(delivered, ['ding', 'dong'])
  } finally {
    bot.off('message', record)
  }
}

test('inbound mock text produces exactly one SDK/provider reply', async t => {
  await messageReply(async (bot, puppet) => {
    const send = t.mock.method(puppet, 'messageSendText')
    await exchange(bot, puppet)
    assert.deepEqual(send.mock.calls.map(call => call.arguments), [['sender', 'dong']])
  })
})

test('plugin uninstall removes only its listener and prevents later handling', async t => {
  await pluginCleanup(async (bot, puppet, uninstall) => {
    const implementation = inspectBot(bot)
    assert.equal(implementation.listenerCount('message'), 1)
    const send = t.mock.method(puppet, 'messageSendText')
    await exchange(bot, puppet)
    let observed = 0
    const unrelated = () => { observed++ }
    bot.on('message', unrelated)
    try {
      assert.equal(implementation.listenerCount('message'), 2)
      uninstall()
      assert.equal(implementation.listenerCount('message'), 1)
      assert.ok(implementation.listeners('message').includes(unrelated))

      const inbound = nextMessage(bot)
      puppet.mocker.ContactMock.load('sender').say('ding')
        .to(puppet.mocker.ContactMock.load('bot'))
      assert.equal((await inbound).text(), 'ding')
      await setImmediate()
      assert.equal(observed, 1)
      assert.equal(send.mock.calls.length, 1)
      assert.equal(puppet.mocker.cacheMessagePayload.size, 3)
    } finally {
      bot.off('message', unrelated)
    }
  })
})

for (const [name, run] of [
  ['message', messageReply],
  ['plugin', pluginCleanup],
] as const) {
  test(`${name} example cleans up when its operation throws`, async () => {
    let savedBot: ReturnType<typeof inspectBot> | undefined
    let stopped = false
    await assert.rejects(run(async bot => {
      savedBot = inspectBot(bot)
      bot.once('stop', () => { stopped = true })
      throw new Error('operation failure')
    }), /operation failure/)
    assert.equal(stopped, true)
    assert.equal(savedBot?.listenerCount('message'), 0)
    assert.equal(savedBot?.listenerCount('error'), 0)
  })
}
