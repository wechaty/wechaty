#!/usr/bin/env ts-node
import {
  Wechaty,
}           from 'wechaty'
import {
  Grpc,
  VERSION,
}             from '@chatie/grpc'

async function main () {
  if (VERSION === '0.0.0') {
    throw new Error('version should be set before publishing')
  }

  const bot = Wechaty.instance()
  try {
    await bot.start()
    console.info(`Wechaty v${bot.version()} smoking test passed.`)
  } catch (e) {
    console.error(e)
    // Error!
    return 1
  } finally {
    await bot.stop()
  }
  return 0
}

main()
  .then(process.exit)
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
