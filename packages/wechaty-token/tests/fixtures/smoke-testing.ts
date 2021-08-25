#!/usr/bin/env ts-node

import {
  WechatyToken,
  VERSION,
}                 from 'wechaty-token'

import assert from 'assert'

async function main () {
  const wechatyToken = new WechatyToken('__sni__/__uuid__')

  assert(wechatyToken.token === '__sni__/__uuid__', 'token should be __sni__/__uuid__')
  assert(wechatyToken.sni === '__sni__', 'sni should be __sni__')

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
