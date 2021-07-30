import fs from 'fs'

import {
  grpc,
  PuppetClient,
  DingRequest,
}                     from '../../src/mod'

import { promisify }  from '../promisify'

export async function testDing (client: PuppetClient) {
  const ding = promisify(client.ding.bind(client))
  const dingRequest = new DingRequest()
  dingRequest.setData('dingdong')
  try {
    // const metadata = new Metadata()
    // metadata.set('grpc.default_authority', 'puppet_token')
    await ding(dingRequest/* metadata */)
  } catch (e) {
    console.error(e)
  }
}

async function main () {
  const TOKEN = '__token__'

  const metadata = new grpc.Metadata()
  metadata.add('authorization', `Bearer ${TOKEN}`)
  const headerCreds = grpc.credentials.createFromMetadataGenerator((_, callback) => callback(null, metadata))

  const certChain  = fs.readFileSync('client.crt')
  const privateKey = fs.readFileSync('client.key')
  const rootCerts  = fs.readFileSync('ca.crt')
  void fs

  const creds = grpc.credentials.combineChannelCredentials(
    // grpc.credentials.createInsecure(),
    grpc.credentials.createSsl(rootCerts, privateKey, certChain),
    headerCreds,
  )

  // const creds = grpc.credentials.createInsecure()

  const client = new PuppetClient(
    'localhost:8788',
    creds,
    {
      'grpc.default_authority': 'puppet_token',
    },
  )

  await testDing(client)

  return 0
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
