import util from 'util'
import fs from 'fs'

import {
  grpc,
  IPuppetServer,
  PuppetService,
  DingResponse,
}                       from '../../src/mod'

import {
  puppetServerImpl,
}                     from '../../tests/puppet-server-impl'

const puppetServerExample: IPuppetServer = {
  ...puppetServerImpl,

  ding: (call, callback) => {
    const data = call.request.getData()
    console.info(`ding(${data})`)
    console.info('metadata:', call.metadata.getMap())
    console.info('getPeer:', call.getPeer())
    console.info('getDeadLine:', call.getDeadline())
    // console.info('getDeadLine:', call.)
    callback(null, new DingResponse())
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

  const rootCerts: Buffer = fs.readFileSync('ca.crt')
  const keyCertPairs: grpc.KeyCertPair[] = [{
    cert_chain  : fs.readFileSync('server.crt'),
    private_key : fs.readFileSync('server.key'),
  }]
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
