#!/usr/bin/env ts-node
import {
  VERSION,
  PuppetService,
}                       from 'wechaty-puppet-service'

async function main () {
  if (VERSION === '0.0.0') {
    throw new Error('version should be set before publishing')
  }

  const puppetService = new PuppetService()
  const version = puppetService.version()

  // try {
  //   await bot.start()
  //   console.info(`Wechaty v${bot.version()} smoking test passed.`)
  // } catch (e) {
  //   console.error(e)
  //   // Error!
  //   return 1
  // } finally {
  //   await bot.stop()
  // }
  return 0
}

main()
  .then(process.exit)
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
