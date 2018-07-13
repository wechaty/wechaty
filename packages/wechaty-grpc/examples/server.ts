import {
  IPuppetServer,
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
const puppetServerImpl: IPuppetServer = {
  contactList: (call, callback) => {
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
  },

  selfId: (call, callback) => {
    const pbId = new Id()
    pbId.setId('lizhuohuan')
    callback(null, pbId)
    // grpc.handleUnaryCall<wechaty_puppet_pb.Empty, wechaty_puppet_pb.Id>;
  },

  start: (call, callback) => {
    // grpc.handleUnaryCall<wechaty_puppet_pb.Empty, wechaty_puppet_pb.Empty>;
  },

  stop: (call, callback) => {
    // grpc.handleUnaryCall<wechaty_puppet_pb.Empty, wechaty_puppet_pb.Empty>;
  },

  contactPayload: (call, callback) => {
    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },
}

/**
 * Starts an RPC server that receives requests for the Greeter service at the
 * sample server port
 */
async function main () {
  const server = new grpc.Server()
  server.addService(
    PuppetService,
    puppetServerImpl,
  )
  server.bind('0.0.0.0:50051', grpc.ServerCredentials.createInsecure())
  server.start()
  return 0
}

main()
// .then(process.exit)
.catch(e => {
  console.error(e)
  process.exit(1)
})
