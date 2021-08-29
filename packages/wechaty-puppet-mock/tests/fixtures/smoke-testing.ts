#!/usr/bin/env node --no-warnings --loader ts-node/esm

import {
  PuppetMock,
  VERSION,
}                 from 'wechaty-puppet-mock'

async function main () {
  const puppet = new PuppetMock()

  if (VERSION === '0.0.0') {
    throw new Error('version should not be 0.0.0 when prepare for publishing')
  }

  console.info(`Puppet v${puppet.version()} smoke testing passed.`)

  return 0
}

main()
  .then(process.exit)
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
