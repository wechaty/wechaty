import { WechatyBuilder, type Wechaty } from 'wechaty'
import { PuppetMock } from 'wechaty-puppet-mock'

export type Exercise = (bot: Wechaty, puppet: PuppetMock) => Promise<void>

export async function runExample (exercise: Exercise = async () => {}) {
  const puppet = new PuppetMock()
  const bot = WechatyBuilder.build({ puppet })
  const errors: Error[] = []
  const onError = (error: Error) => { errors.push(error) }
  bot.on('error', onError)

  try {
    await bot.start()
    await exercise(bot, puppet)
  } finally {
    try {
      await bot.stop()
    } finally {
      bot.off('error', onError)
    }
  }

  // The host chooses how to handle failures; this executable example rejects.
  if (errors.length) {
    throw new AggregateError(errors, 'Mock bot reported errors')
  }
}
