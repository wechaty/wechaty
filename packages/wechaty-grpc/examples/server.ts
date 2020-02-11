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

    eventResponse.setType(EventType.EVENT_TYPE_DONG)

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
    contactListResponse.setIdsList(idList)

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

  contactSelfQRCode: (call, callback) => {
    void call
    void callback
    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },
  contactSelfName: (call, callback) => {
    void call
    void callback
    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },
  contactSelfSignature: (call, callback) => {
    void call
    void callback
    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },
  contactAlias: (call, callback) => {
    void call
    void callback
    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },
  contactAvatar: (call, callback) => {
    void call
    void callback
    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },
  friendshipSearchPhone: (call, callback) => {
    void call
    void callback
    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },
  friendshipSearchWeixin: (call, callback) => {
    void call
    void callback
    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },
  friendshipAdd: (call, callback) => {
    void call
    void callback
    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },
  frendshipAccept: (call, callback) => {
    void call
    void callback
    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },
  messageContact: (call, callback) => {
    void call
    void callback
    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },
  messageFile: (call, callback) => {
    void call
    void callback
    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },
  messageMiniProgram: (call, callback) => {
    void call
    void callback
    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },
  messageUrl: (call, callback) => {
    void call
    void callback
    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },
  messageSendContact: (call, callback) => {
    void call
    void callback
    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },
  messageSendFile: (call, callback) => {
    void call
    void callback
    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },
  messageSendText: (call, callback) => {
    void call
    void callback
    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },
  messageSendMiniProgram: (call, callback) => {
    void call
    void callback
    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },
  messageSendUrl: (call, callback) => {
    void call
    void callback
    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },
  messageRecall: (call, callback) => {
    void call
    void callback
    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },
  roomAdd: (call, callback) => {
    void call
    void callback
    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },
  roomAvatar: (call, callback) => {
    void call
    void callback
    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },
  roomCreate: (call, callback) => {
    void call
    void callback
    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },
  roomDel: (call, callback) => {
    void call
    void callback
    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },
  roomQuit: (call, callback) => {
    void call
    void callback
    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },
  roomTopic: (call, callback) => {
    void call
    void callback
    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },
  roomQRCode: (call, callback) => {
    void call
    void callback
    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },
  roomAnnounce: (call, callback) => {
    void call
    void callback
    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },
  roomMemberPayload: (call, callback) => {
    void call
    void callback
    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },
  roomMemberList: (call, callback) => {
    void call
    void callback
    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },
  roomInvitationAccept: (call, callback) => {
    void call
    void callback
    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },
  tagContactAdd: (call, callback) => {
    void call
    void callback
    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },
  tagContactRemove: (call, callback) => {
    void call
    void callback
    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },
  tagContactDelete: (call, callback) => {
    void call
    void callback
    // grpc.handleUnaryCall<wechaty_puppet_pb.Id, wechaty_puppet_pb.ContactPayload>;
  },
  tagContactList: (call, callback) => {
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
