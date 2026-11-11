import type { Wechaty } from 'wechaty'
import type { Message } from 'wechaty/users'

import { runExample as runStartup, type Exercise } from './startup.js'

export function createMessageListener (bot: Wechaty) {
  return async (message: Message) => {
    try {
      if (!message.self() && message.text() === 'ding') {
        await message.say('dong')
      }
    } catch (error) {
      bot.emitError(error)
    }
  }
}

export async function runExample (exercise: Exercise) {
  await runStartup(async (bot, puppet) => {
    const onMessage = createMessageListener(bot)
    bot.on('message', onMessage)
    try {
      await exercise(bot, puppet)
    } finally {
      bot.off('message', onMessage)
    }
  })
}
