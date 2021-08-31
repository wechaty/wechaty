#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  puppet,
  VERSION,
}                           from 'wechaty-grpc'

async function main () {
  const messagePayloadResponse = new puppet.MessagePayloadResponse()
  messagePayloadResponse.setId('id')

  if (VERSION === '0.0.0') {
    throw new Error('version should be set before publishing')
  }

  console.info(`wechaty-grpc v${VERSION} smoking test passed.`)
  return 0
}

main()
  .then(process.exit)
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
