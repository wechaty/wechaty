/* eslint-disable sort-keys */

import grpc from 'grpc'

import {
  ContactListResponse,
  IPuppetServer,
  PuppetService,
  EventResponse,
  EventType,
  ContactAliasResponse,
}                       from '../src/index'

import { StringValue } from 'google-protobuf/google/protobuf/wrappers_pb'

import {
  puppetServerImpl,
}                     from '../tests/puppet-server-impl'
/**
 * Implements the SayHello RPC method.
 */
const puppetServerExample: IPuppetServer = {
  ...puppetServerImpl,

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
    }, 2 * 1000 + 500)
  },

  contactList: (call, callback) => {
    void call

    const contactListResponse = new ContactListResponse()

    const idList = ['a', 'b', 'c']
    contactListResponse.setIdsList(idList)

    callback(null, contactListResponse)
  },

  contactAlias: (call, callback) => {
    const id = call.request.getId()
    const alias = call.request.getAlias()

    console.info('id:', id)
    console.info('alias:', alias)

    const response = new ContactAliasResponse()

    if (alias) {
      callback(null, response)
      return
    }

    const aliasWrapper = new StringValue()
    aliasWrapper.setValue('my alias')
    response.setAlias(aliasWrapper)
    callback(null, response)
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
    puppetServerExample,
  )
  server.bind('127.0.0.1:8788', grpc.ServerCredentials.createInsecure())
  server.start()
  return 0
}

main()
  // .then(process.exit)
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
