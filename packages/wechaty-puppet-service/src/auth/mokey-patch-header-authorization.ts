import type http2 from 'http2'

import { log } from 'wechaty-puppet'

import type {
  Metadata,
}             from './grpc-js.js'

/**
 * Huan(202108): This is for compatible with old clients (version v0.26 or before)
 *  for non-tls authorization:
 *    use the HTTP2 header `:authority` as the token.
 *
 * This feature is planed to be removed after Dec 31, 2022
 */
function monkeyPatchMetadataFromHttp2Headers (
  MetadataClass: typeof Metadata,
): () => void {
  log.verbose('wechaty-puppet-service', 'monkeyPatchMetadataFromHttp2Headers()')

  const fromHttp2Headers = MetadataClass.fromHttp2Headers
  MetadataClass.fromHttp2Headers = function (
    headers: http2.IncomingHttpHeaders,
  ): Metadata {
    const metadata = fromHttp2Headers.call(MetadataClass, headers)

    if (metadata.get('authorization').length <= 0) {
      const authority = headers[':authority']
      const authorization = `Wechaty ${authority}`
      metadata.set('authorization', authorization)
    }
    return metadata
  }

  /**
   * un-monkey-patch
   */
  return () => {
    MetadataClass.fromHttp2Headers = fromHttp2Headers
  }
}

export {
  monkeyPatchMetadataFromHttp2Headers,
}
