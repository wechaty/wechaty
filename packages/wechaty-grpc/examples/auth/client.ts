import type { CallMetadataGenerator } from '@grpc/grpc-js/build/src/call-credentials'
import fs from 'fs'

import {
  grpc,
  puppet,
}                     from '../../src/mod.js'

import { promisify }  from '../promisify.js'

export async function testDing (client: puppet.PuppetClient) {
  const ding = promisify(client.ding.bind(client))
  const dingRequest = new puppet.DingRequest()
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
  void TOKEN

  const rootCerts  = fs.readFileSync('root-ca.crt')

  /**
   * With server authentication SSL/TLS and a custom header with token
   *  https://grpc.io/docs/guides/auth/#with-server-authentication-ssltls-and-a-custom-header-with-token-1
   */
  const metaCallback: CallMetadataGenerator = (_params, callback) => {
    const meta = new grpc.Metadata()
    // metadata.add('authorization', `Wechaty ${TOKEN}`)
    callback(null, meta)
  }

  const channelCred = grpc.credentials.createSsl(rootCerts)
  const callCred    = grpc.credentials.createFromMetadataGenerator(metaCallback)
  const combCreds   = grpc.credentials.combineChannelCredentials(channelCred, callCred)

  const client = new puppet.PuppetClient(
    'localhost:8788',
    combCreds,
    {
      'grpc.default_authority': '__token__',
      'grpc.ssl_target_name_override': 'wechaty-puppet-service',
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
