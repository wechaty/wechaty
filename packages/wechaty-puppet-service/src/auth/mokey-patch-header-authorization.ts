import http2 from 'http2'

import { log } from '../config'

import {
  Metadata,
}             from './grpc-js'

function monkeyPatchMetadataFromHttp2Headers (
  MetadataClass: typeof Metadata,
): () => void {
  log.verbose('wechaty-puppet-service', 'monkeyPatchMetadataFromHttp2Headers()')

  const fromHttp2Headers = MetadataClass.fromHttp2Headers
  MetadataClass.fromHttp2Headers = function (
    headers: http2.IncomingHttpHeaders
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
