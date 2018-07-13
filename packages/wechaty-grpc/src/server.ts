import {
  PuppetService,
}                 from '../generated/wechaty-puppet_grpc_pb'
import {
  ContactList,
  Id,
}                 from '../generated/wechaty-puppet_pb'

import grpc from 'grpc'

// tslint:disable:no-console

/**
 * Implements the SayHello RPC method.
 */
function contactList (call: any, callback: any) {
  const pbContactList = new ContactList()

  const idList = ['a', 'b', 'c']

  pbContactList.setIdList(
    idList.map(id => {
      const pbId = new Id()
      pbId.setId(id)
      return pbId
    })
  )

  callback(null, pbContactList)
}

/**
 * Starts an RPC server that receives requests for the Greeter service at the
 * sample server port
 */
async function main () {
  const server = new grpc.Server()
  server.addService(
    PuppetService,
    {
      contactList,
    }
  )
  server.bind('0.0.0.0:50051', grpc.ServerCredentials.createInsecure())
  server.start()
}

main()
