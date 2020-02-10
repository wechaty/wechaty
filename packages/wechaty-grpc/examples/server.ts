/* eslint-disable sort-keys */

import grpc from 'grpc'

import {
  ContactListResponse,
  IPuppetServer,
  PuppetService,
  SelfIdResponse,
  EventResponse,
  EventType,
}                       from '../src/index'

/**
 * Implements the SayHello RPC method.
 */
const puppetServerImpl: IPuppetServer = {

  event: (streamnigCall) => {
    const eventResponse = new EventResponse()

    eventResponse.setType(EventType.DONG)

    let n = 42

    const timer = setInterval(() => {
      eventResponse.setPayload(JSON.stringify({ n: n++ }))
      streamnigCall.write(eventResponse)
    }, 1000)

    setTimeout(() => {
      clearInterval(timer)

      eventResponse.setPayload(JSON.stringify({ n: n++ }))
      streamnigCall.write(eventResponse)

      setImmediate(() => streamnigCall.end())
    }, 3 * 1000 + 500)
  },

  contactList: (call, callback) => {
    void call

    const contactListResponse = new ContactListResponse()

    const idList = ['a', 'b', 'c']
    contactListResponse.setIdList(idList)

    callback(null, contactListResponse)
  },

  selfId: (call, callback) => {
    void call

    const selfIdResponse = new SelfIdResponse()
    selfIdResponse.setId('lizhuohuan')
    callback(null, selfIdResponse)
    // grpc.handleUnaryCall<wechaty_puppet_pb.Empty, wechaty_puppet_pb.Id>;
  },

  start: (call, callback) => {
    // grpc.handleUnaryCall<wechaty_puppet_pb.Empty, wechaty_puppet_pb.Empty>;
    void call
    void callback
  },

  stop: (call, callback) => {
    // grpc.handleUnaryCall<wechaty_puppet_pb.Empty, wechaty_puppet_pb.Empty>;
    void call
    void callback
  },

  logout: (call, callback) => {
    // grpc.handleUnaryCall<wechaty_puppet_pb.Empty, wechaty_puppet_pb.Empty>;
    void call
    void callback
  },

  logonoff: (call, callback) => {
    void call
    void callback

    // grpc.handleUnaryCall<wechaty_puppet_pb.Empty, wechaty_puppet_pb.Empty>;
  },

  ding: (call, callback) => {
    void call
    void callback

    // grpc.handleUnaryCall<wechaty_puppet_pb.Empty, wechaty_puppet_pb.Empty>;
  },

  version: (call, callback) => {
    void call
    void callback

    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },

  contactPayload: (call, callback) => {
    void call
    void callback

    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },

  friendshipPayload: (call, callback) => {
    void call
    void callback
    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },

  roomList: (call, callback) => {
    void call
    void callback
    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },
  roomPayload: (call, callback) => {
    void call
    void callback
    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },

  roomInvitationPayload: (call, callback) => {
    void call
    void callback
    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },

  messagePayload: (call, callback) => {
    void call
    void callback
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
  server.bind('0.0.0.0:8788', grpc.ServerCredentials.createInsecure())
  server.start()
  return 0
}

main()
  // .then(process.exit)
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
