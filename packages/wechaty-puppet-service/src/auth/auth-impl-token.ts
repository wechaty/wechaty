import { log } from 'wechaty-puppet'

import {
  StatusBuilder,
  UntypedHandleCall,
  sendUnaryData,
  Metadata,
  ServerUnaryCall,
  GrpcStatus,
  UntypedServiceImplementation,
}                                 from './grpc-js.js'

import { monkeyPatchMetadataFromHttp2Headers }  from './mokey-patch-header-authorization.js'

/**
 * Huan(202108): Monkey patch to support
 *  copy `:authority` from header to metadata
 */
monkeyPatchMetadataFromHttp2Headers(Metadata)

/**
 * Huan(202108): wrap handle calls with authorization
 *
 * See:
 *  https://grpc.io/docs/guides/auth/#with-server-authentication-ssltls-and-a-custom-header-with-token
 */
const authWrapHandlerToken = (validToken: string) => (handler: UntypedHandleCall) => {
  log.verbose('wechaty-puppet-service',
    'auth/auth-impl-token.ts authWrapHandlerToken(%s)(%s)',
    validToken,
    handler.name,
  )

  return function (
    call: ServerUnaryCall<any, any>,
    cb?: sendUnaryData<any>,
  ) {
    // console.info('wrapAuthHandler internal')

    const authorization = call.metadata.get('authorization')[0]
    // console.info('authorization', authorization)

    let errMsg = ''
    if (typeof authorization === 'string') {
      if (authorization.startsWith('Wechaty ')) {
        const token = authorization.substring(8 /* 'Wechaty '.length */)
        if (token === validToken) {

          return handler(
            call as any,
            cb as any,
          )

        } else {
          errMsg = `Invalid Wechaty TOKEN "${token}"`
        }
      } else {
        const type = authorization.split(/\s+/)[0]
        errMsg = `Invalid authorization type: "${type}"`
      }
    } else {
      errMsg = 'No Authorization found.'
    }

    /**
     * Not authorized
     */
    const error = new StatusBuilder()
      .withCode(GrpcStatus.UNAUTHENTICATED)
      .withDetails(errMsg)
      .withMetadata(call.metadata)
      .build()

    if (cb) {
      /**
        * Callback:
        *  handleUnaryCall
        *  handleClientStreamingCall
        */
      cb(error)
    } else if ('emit' in call) {
      /**
        * Stream:
        *  handleServerStreamingCall
        *  handleBidiStreamingCall
        */
      call.emit('error', error)
    } else {
      throw new Error('no callback and call is not emit-able')
    }
  }
}

const authImplToken = <T extends UntypedServiceImplementation>(validToken: string) => (
  serviceImpl: T,
) => {
  log.verbose('wechaty-puppet-service', 'authImplToken()')

  for (const [key, val] of Object.entries(serviceImpl)) {
    // any: https://stackoverflow.com/q/59572522/1123955
    (serviceImpl as any)[key] = authWrapHandlerToken(validToken)(val)
  }
  return serviceImpl
}

export {
  authImplToken,
}
