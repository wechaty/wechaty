import * as grpc from 'grpc'

import {
  Puppet,
}             from '../../wechaty/src/puppet/'

import {
  PuppetService,
  IPuppetServer,
}                     from '../generated/wechaty-puppet_grpc_pb'

import {
  ContactList,
  ContactPayload,
  Empty,
  Id,
}                     from '../generated/wechaty-puppet_pb'


import {
  PuppetClient,
}                 from '../generated/wechaty-puppet_grpc_pb'
import {
  Empty,
}                 from '../generated/wechaty-puppet_pb'

import grpc from 'grpc'

// tslint:disable:no-console

async function main () {
  const client = new PuppetClient(
    'localhost:50051',
    grpc.credentials.createInsecure()
  )

  const empty = new Empty()

  client.contactList(empty, (err, response) => {
    if (err) {
      console.error(err)
      return
    }
    console.log('contactList:', response.getIdList().map(pbId => pbId.getId()))
  })

  client.selfId(empty, (err, response) => {
    if (err) {
      console.error(err)
      return
    }
    console.log('selfId:', response.getId())
  })

}

main()
// .then(process.exit)
// .catch(e => {
//   console.error(e)
//   process.exit(1)
// })
