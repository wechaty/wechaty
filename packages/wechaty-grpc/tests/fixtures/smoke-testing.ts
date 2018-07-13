#!/usr/bin/env ts-node

// tslint:disable:no-console

import {
  Id,
  VERSION,
}           from '@chatie/grpc'

async function main () {
  const pbId = new Id()
  pbId.setId('id')
  console.log(`@chatie/grpc v${VERSION} smoking test passed.`)
  return 0
}

main()
.then(process.exit)
.catch(e => {
  console.error(e)
  process.exit(1)
})
