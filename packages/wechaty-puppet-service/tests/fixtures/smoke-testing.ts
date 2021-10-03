#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
import {
  VERSION,
  PuppetService,
}                       from 'wechaty-puppet-service'

async function main () {
  const puppetService = new PuppetService()

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

  if (VERSION === '0.0.0') {
    throw new Error('version should be set before publishing')
  }

  console.info('Wechaty Puppet Service v' + puppetService.version() + ' passed.')
  return 0
}

main()
  .then(process.exit)
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
