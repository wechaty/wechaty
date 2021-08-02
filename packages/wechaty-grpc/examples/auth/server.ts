import util from 'util'
import fs from 'fs'

import { Status as GrpcServerStatus } from '@grpc/grpc-js/build/src/constants'

import {
  grpc,
  IPuppetServer,
  PuppetService,
  DingResponse,
}                       from '../../src/mod'

import {
  puppetServerImpl,
}                     from '../../tests/puppet-server-impl'
import { StatusBuilder } from '@grpc/grpc-js'

const puppetServerExample: IPuppetServer = {
  ...puppetServerImpl,

  ding: (call, callback) => {
    const data = call.request.getData()
    console.info(`ding(${data})`)
    console.info('metadata:', call.metadata.getMap())
    console.info('getPeer:', call.getPeer())
    console.info('getDeadLine:', call.getDeadline())

    const error = new StatusBuilder()
      .withCode(GrpcServerStatus.UNAUTHENTICATED)
      .withDetails('The server need "Authorization: Wechaty TOKEN" to accept the request')
      .withMetadata(call.metadata)
      .build()

    void error
    callback(null, new DingResponse())

    // console.info('getDeadLine:', call.)
    // callback(error, new DingResponse())
  },
}

async function main () {
  const server = new grpc.Server()
  server.addService(
    PuppetService,
    puppetServerExample,
  )

  const serverBindPromise = util.promisify(
    server.bindAsync.bind(server)
  )

  void fs

  const rootCerts: null | Buffer = null // fs.readFileSync('ca.crt')
  const keyCertPairs: grpc.KeyCertPair[] = []
  // [{
  //   cert_chain  : fs.readFileSync('server.crt'),
  //   private_key : fs.readFileSync('server.key'),
  // }]
  const checkClientCertificate = false

  const port = await serverBindPromise(
    '127.0.0.1:8788',
    // grpc.ServerCredentials.createInsecure(),
    grpc.ServerCredentials.createSsl(rootCerts, keyCertPairs, checkClientCertificate),

  )
  console.info('Listen on port:', port)
  server.start()
  return 0
}

main()
  .catch(console.error)
