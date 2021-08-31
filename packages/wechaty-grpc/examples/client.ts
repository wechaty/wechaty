// import { Metadata } from '@grpc/grpc-js'
import { StringValue } from 'google-protobuf/google/protobuf/wrappers_pb'

// import { CallMetadataGenerator } from '@grpc/grpc-js/build/src/call-credentials'

import {
  grpc,
  puppet,
}                     from '../src/mod.js'

import { promisify }  from './promisify.js'

export async function testAlias (client: puppet.PuppetClient) {
  const request = new puppet.ContactAliasRequest()

  const contactAlias = promisify(client.contactAlias.bind(client))

  {
    const response = await contactAlias(request)
    const aliasWrapper = response.getAlias()
    let alias
    if (aliasWrapper) {
      alias = aliasWrapper.getValue()
    }
    console.info('returned alias:', alias)
  }

  console.info('##############')

  {
    const aliasWrapper = new StringValue()
    aliasWrapper.setValue('test alias')

    request.setAlias(aliasWrapper)
    const response = await contactAlias(request)

    const returnAliasWrapper = response.getAlias()
    if (returnAliasWrapper) {
      console.info('returned alias:', returnAliasWrapper)
      throw new Error('should not has alas return')
    }

    console.info('ok')
  }
}

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

export function testStream (client: puppet.PuppetClient) {
  // event(request: wechaty_puppet_event_pb.EventRequest, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<wechaty_puppet_event_pb.EventRequest>;
  const eventStream = client.event(new puppet.EventRequest())
  eventStream
    .on('data', (chunk: puppet.EventResponse) => {
      // console.info('EventType:', EventType)
      // console.info('type:', chunk.getType(), EventType[chunk.getType()], EventType[23])
      console.info('payload:', chunk.getPayload())
      // console.info('eventStream.on(data):', chunk)
    })
    .on('end', () => {
      console.info('eventStream.on(end)')
    })
}

async function main () {
  // const metadata = new grpc.Metadata()
  // metadata.add('authorization', 'Bearer ' + 'access_token')
  // const generateMetadata: CallMetadataGenerator = (_params, callback) => { console.info('generateMetadata'); callback(null, metadata) }

  // const authCred = grpc.credentials.createFromMetadataGenerator(generateMetadata)
  // const sslCred = grpc.credentials.createSsl()

  // const creds = grpc.credentials.combineChannelCredentials(
  //   sslCred,
  //   authCred,
  // )
  const creds = grpc.credentials.createInsecure()

  const client = new puppet.PuppetClient(
    'localhost:8788',
    creds,
    {
      'grpc.default_authority': 'puppet_token',
    },
  )

  testStream(client)
  setInterval(() => testDing(client), 1000)
  // await testAlias(client)

  return 0
}

main()
  // .then(process.exit)
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
