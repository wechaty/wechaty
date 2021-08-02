#!/usr/bin/env ts-node

import {
  WechatyToken,
  VERSION,
}                 from 'wechaty-token'

async function main () {
  if (VERSION === '0.0.0') {
    throw new Error('version should not be 0.0.0 when prepare for publishing')
  }

  const wechatyToken = new WechatyToken()
  console.info(`Puppet v${wechatyToken.version()} smoke testing passed.`)
  return 0
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
