#!/usr/bin/env ts-node

import {
  WechatyToken,
  VERSION,
}                 from 'wechaty-token'

import assert from 'assert'

async function main () {
  const wechatyToken = new WechatyToken('SNI_UUID')

  assert(wechatyToken.token === 'SNI_UUID', 'TOKEN should be SNI_UUID')
  assert(wechatyToken.sni === 'sni', 'SNI should be sni')

  if (VERSION === '0.0.0') {
    throw new Error('version should not be 0.0.0 when prepare for publishing')
  }

  console.info(`Puppet v${wechatyToken.version()} smoke testing passed.`)
  return 0
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
