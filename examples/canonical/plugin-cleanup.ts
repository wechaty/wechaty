import type { WechatyPlugin, WechatyPluginUninstaller } from 'wechaty'

import { createMessageListener } from './message-reply.js'
import { runExample as runStartup, type Exercise } from './startup.js'

export const DingDongPlugin: WechatyPlugin = bot => {
  const onMessage = createMessageListener(bot)
  bot.on('message', onMessage)
  return () => { bot.off('message', onMessage) }
}

export async function runExample (
  exercise: (...args: [...Parameters<Exercise>, WechatyPluginUninstaller]) => Promise<void>,
) {
  await runStartup(async (bot, puppet) => {
    const uninstall = bot.use(DingDongPlugin)
    try {
      await exercise(bot, puppet, uninstall)
    } finally {
      // stop() is not a substitute for explicitly uninstalling a plugin.
      uninstall()
    }
  })
}
