/**
 * Full-stack Wechaty TCK scenarios and real-world chatbot automation recipes
 * powered by `wechaty-puppet-mock/tck` (`createMockWorld`).
 *
 * Why this file exists:
 * Verifies the complete `Wechaty` -> `PuppetMock` -> `PuppetAbstract` stack
 * end-to-end across human WeChat operations and bot automation workflows.
 */

import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { createMockWorld } from 'wechaty-puppet-mock/tck'

import {
  Wechaty,
  types,
  type Contact,
} from './mods/browser.ts'

const withWatchdog = async <T>(promise: Promise<T>, label: string, timeoutMs = 5_000): Promise<T> => {
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

const registerStop = (
  t: { after: (fn: () => Promise<void> | void) => void },
  bot: Wechaty,
  label: string,
): void => {
  t.after(async () => {
    await withWatchdog(bot.stop().catch(() => undefined), `${label} cleanup`)
  })
}

describe('Wechaty TCK: Public API & Chatbot Automation Recipes', () => {
  test('Public API: ContactSelf, Contact, Tag, Room, Friendship & useScoped()', async (t) => {
    const { puppet, alice, bob, room, loginReady } = await createMockWorld(t, { autoStart: false })
    const bot = new Wechaty({ puppet })

    const lifecycleLog: string[] = []
    bot.useScoped(() => {
      lifecycleLog.push('install')
      return () => {
        lifecycleLog.push('uninstall')
      }
    })

    registerStop(t, bot, 'Public API')

    await bot.start()
    await loginReady()
    assert.deepEqual(lifecycleLog, ['install'])
    assert.equal(bot.isLoggedIn, true)

    await bot.currentUser.name('TCK Wechaty Bot')
    assert.equal(bot.currentUser.name(), 'TCK Wechaty Bot')

    const foundAlice = await bot.Contact.find({ name: 'Alice' })
    assert.ok(foundAlice, 'Contact.find() locates Alice')
    await foundAlice.alias('Alice Alias')
    assert.equal(await foundAlice.alias(), 'Alice Alias')

    const wechatyRoom = await bot.Room.find({ id: room.id })
    assert.ok(wechatyRoom, 'Room.find() locates seeded room')
    await wechatyRoom.topic('Updated TCK Topic')
    assert.equal(await wechatyRoom.topic(), 'Updated TCK Topic')

    const foundBob = await bot.Friendship.search({ handle: 'bob_wx' })
    assert.equal(foundBob?.id, bob.id)

    const vipTag = await bot.Tag.get('vip')
    await vipTag.add(foundAlice)
    assert.ok((await foundAlice.tags()).some((tag) => tag.id === 'vip'))
    await vipTag.remove(foundAlice)

    await bot.stop()
    assert.deepEqual(lifecycleLog, ['install', 'uninstall'])
    assert.equal(alice.id, foundAlice.id)
  })

  test('Recipe 1: Ding-Dong Responder', async (t) => {
    const { puppet, botUser, alice, loginReady } = await createMockWorld(t, { autoStart: false })
    const bot = new Wechaty({ puppet })
    registerStop(t, bot, 'Recipe 1')

    const replyFuture = new Promise<string>((resolve) => {
      alice.on('message', (msg) => {
        if (msg.text() === 'dong') {
          resolve(msg.text() ?? '')
        }
      })
    })
    const botHydratedDong = new Promise<void>((resolve) => {
      bot.addEventListener('message', ({ detail: msg }) => {
        if (msg.text() === 'dong') {
          resolve()
        }
      })
    })

    bot.addEventListener('message', async ({ detail: msg }) => {
      if (msg.self() || msg.age() > 120) return
      if (msg.type() === types.Message.Text && msg.text() === 'ding') {
        await msg.say('dong')
      }
    })

    await bot.start()
    await loginReady()
    alice.say('ding').to(botUser)
    const [reply] = await withWatchdog(Promise.all([replyFuture, botHydratedDong]), 'Recipe 1 reply')
    assert.equal(reply, 'dong')
  })

  test('Recipe 2: Room Greeter & Anti-Spam Recall/Kick', async (t) => {
    const { puppet, bob, room, loginReady } = await createMockWorld(t, { autoStart: false })
    const bot = new Wechaty({ puppet })
    registerStop(t, bot, 'Recipe 2')

    const welcomeFuture = new Promise<string>((resolve) => {
      room.on('message', (msg) => {
        if (msg.text()?.includes('Welcome')) {
          resolve(msg.text() ?? '')
        }
      })
    })
    const botHydratedWelcome = new Promise<void>((resolve) => {
      bot.addEventListener('message', ({ detail: msg }) => {
        if (msg.text()?.includes('Welcome')) {
          resolve()
        }
      })
    })

    bot.addEventListener('room-join', async ({ detail: { room: joinedRoom, inviteeList } }) => {
      const names = inviteeList.map((c: Contact) => c.name()).join(', ')
      await joinedRoom.say(`Welcome ${names}!`)
    })

    const kickedFuture = bot.next('room-leave')
    const recalledNoticeFuture = new Promise<void>((resolve) => {
      bot.addEventListener('message', ({ detail: msg }) => {
        if (msg.type() === types.Message.Recalled) {
          resolve()
        }
      })
    })
    bot.addEventListener('message', async ({ detail: msg }) => {
      const msgRoom = msg.room()
      if (msgRoom && msg.text().includes('SPAM')) {
        await msg.recall()
        await msgRoom.remove(msg.talker() as Parameters<typeof msgRoom.remove>[0])
      }
    })

    await bot.start()
    await loginReady()
    await puppet.roomAdd(room.id, bob.id)
    const [welcome] = await withWatchdog(Promise.all([welcomeFuture, botHydratedWelcome]), 'Recipe 2 welcome')
    assert.equal(welcome, 'Welcome Bob!')

    bob.say('Buy SPAM now').to(room)
    const [leaveEvent] = await withWatchdog(Promise.all([kickedFuture, recalledNoticeFuture]), 'Recipe 2 kick')
    assert.ok(leaveEvent.leaverList.some((c) => c.id === bob.id))
  })

  test('Recipe 3: Auto-Accept Friendship & Group Onboarding', async (t) => {
    const { puppet, bob, room, loginReady } = await createMockWorld(t, { autoStart: false })
    const bot = new Wechaty({ puppet })
    registerStop(t, bot, 'Recipe 3')

    const welcomeDmFuture = new Promise<string>((resolve) => {
      bob.on('message', (msg) => {
        if (msg.text()?.includes('onboarded')) {
          resolve(msg.text() ?? '')
        }
      })
    })
    const botHydratedDm = new Promise<void>((resolve) => {
      bot.addEventListener('message', ({ detail: msg }) => {
        if (msg.text()?.includes('onboarded')) {
          resolve()
        }
      })
    })
    const joinedRoomFuture = bot.next('room-join')
    const confirmFriendshipFuture = new Promise<void>((resolve) => {
      bot.addEventListener('friendship', ({ detail: friendship }) => {
        if (friendship.type() === types.Friendship.Confirm) {
          resolve()
        }
      })
    })

    bot.addEventListener('friendship', async ({ detail: friendship }) => {
      if (friendship.type() === types.Friendship.Receive && friendship.hello().includes('wechaty')) {
        await friendship.accept()
        const contact = friendship.contact()
        await contact.say('You are onboarded!')
        const targetRoom = await bot.Room.find({ id: room.id })
        if (targetRoom) {
          await targetRoom.add(contact)
        }
      }
    })

    await bot.start()
    await loginReady()
    puppet.mocker.receiveFriendship(bob, 'hello wechaty', types.Friendship.Receive)

    const [dm, joinEvent] = await withWatchdog(
      Promise.all([welcomeDmFuture, joinedRoomFuture, confirmFriendshipFuture, botHydratedDm]),
      'Recipe 3 onboarding',
    )
    assert.equal(dm, 'You are onboarded!')
    assert.ok(joinEvent.inviteeList.some((c) => c.id === bob.id))
  })

  test('Recipe 4: Cross-Chat Forwarder', async (t) => {
    const { puppet, botUser, alice, room, loginReady } = await createMockWorld(t, { autoStart: false })
    const bot = new Wechaty({ puppet })
    registerStop(t, bot, 'Recipe 4')

    const forwardedFuture = new Promise<string>((resolve) => {
      room.on('message', (msg) => {
        if (msg.text() === 'important update') {
          resolve(msg.text() ?? '')
        }
      })
    })
    const botHydratedForward = new Promise<void>((resolve) => {
      bot.addEventListener('message', ({ detail: msg }) => {
        if (msg.room()?.id === room.id && msg.text() === 'important update') {
          resolve()
        }
      })
    })

    bot.addEventListener('message', async ({ detail: msg }) => {
      if (!msg.room() && msg.text() === 'important update') {
        const targetRoom = await bot.Room.find({ id: room.id })
        if (targetRoom) {
          await msg.forward(targetRoom)
        }
      }
    })

    await bot.start()
    await loginReady()
    alice.say('important update').to(botUser)
    const [forwarded] = await withWatchdog(Promise.all([forwardedFuture, botHydratedForward]), 'Recipe 4 forward')
    assert.equal(forwarded, 'important update')
  })

  test('Recipe 5: AI Agent Stream Consumer with AbortController', async (t) => {
    const { puppet, botUser, alice, loginReady } = await createMockWorld(t, { autoStart: false })
    const bot = new Wechaty({ puppet })
    registerStop(t, bot, 'Recipe 5')

    await bot.start()
    await loginReady()

    const ac = new AbortController()
    const received: string[] = []

    const loopPromise = (async () => {
      for await (const msg of bot.messages({ signal: ac.signal })) {
        received.push(msg.text())
        if (received.length >= 2) {
          ac.abort()
        }
      }
    })()

    alice.say('prompt-1').to(botUser)
    alice.say('prompt-2').to(botUser)

    await withWatchdog(loopPromise, 'Recipe 5 stream')
    assert.deepEqual(received, ['prompt-1', 'prompt-2'])
  })
})
