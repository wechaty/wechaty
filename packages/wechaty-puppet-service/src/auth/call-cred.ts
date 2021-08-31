import {
  credentials,
  CallMetadataGenerator,
  Metadata,
}                         from './grpc-js.js'

/**
 * With server authentication SSL/TLS and a custom header with token
 *  https://grpc.io/docs/guides/auth/#with-server-authentication-ssltls-and-a-custom-header-with-token-1
 */
const metaGeneratorToken: (token: string) => CallMetadataGenerator = token => (_params, callback) => {
  const meta = new Metadata()
  meta.add('authorization', `Wechaty ${token}`)
  callback(null, meta)
}

const callCredToken = (token: string) => credentials.createFromMetadataGenerator(metaGeneratorToken(token))

export {
  callCredToken,
  metaGeneratorToken,
}
