/**
 * [RFC] We need a better error system #159
 *  https://github.com/wechaty/puppet/issues/159
 */
import { log } from '../config.js'

import type { EcmaError }   from './ecma.js'
import { isEcmaError }      from './ecma.js'
import type { GrpcStatus }  from './grpc.js'
import {
  isGrpcStatus,
  Code,
}                           from './grpc.js'

const isGError = (payload: any): payload is GError => payload instanceof Object
  && isEcmaError(payload)
  && isGrpcStatus(payload)

class GError extends Error implements GrpcStatus, EcmaError {

  /**
   * GrpcStatus additional properties
   */
  code     : number
  details? : any[]

  /**
   * From a gRPC standard error
   *  Protobuf
   */
  public static fromJSON (payload: string | GrpcStatus | EcmaError) {
    log.verbose('PuppetError', 'from("%s")', JSON.stringify(payload))

    if (typeof payload === 'string') {
      payload = JSON.parse(payload)
    }

    if (!isEcmaError(payload) && !isGrpcStatus(payload)) {
      throw new Error('payload is neither EcmaError nor GrpcStatus')
    }

    const e = new this(payload)
    return e
  }

  protected constructor (
    payload: GrpcStatus | EcmaError,
  ) {
    super()
    log.verbose('PuppetError', 'constructor("%s")', JSON.stringify(payload))

    /**
     * Common properties
     */
    this.message = payload.message

    if (isGError(payload)) {
      this.code    = payload.code
      this.details = payload.details
      this.name    = payload.name
      this.stack   = payload.stack

    } else if (isGrpcStatus(payload)) {
      this.code    = payload.code
      this.details = payload.details
      /**
       * Convert gRPC error to EcmaError
       */
      this.name = Array.isArray(payload.details) && payload.details.length > 0
        ? payload.details[0]
        : Code[this.code] || String(this.code)

    } else if (isEcmaError(payload)) {
      this.name  = payload.name
      this.stack = payload.stack
      /**
       * Convert EcmaError to gRPC error
       */
      this.code  = Code.UNKNOWN
      this.details = [
        payload.name,
        ...payload.stack?.split('\n') ?? [],
      ]

    } else {
      throw new Error('payload is neither EcmaError nor GrpcStatus')
    }
  }

  public toJSON (): GrpcStatus & EcmaError {
    return {
      code    : this.code,
      details : this.details,
      message : this.message,
      name    : this.name,
      stack   : this.stack,
    }
  }

  public toGrpcStatus (): GrpcStatus {
    return {
      code    : this.code,
      details : this.details,
      message : this.message,
    }
  }

  public toEcmaError (): EcmaError {
    return {
      message : this.message,
      name    : this.name,
      stack   : this.stack,
    }
  }

}

export {
  GError,
  isGError,
  isGrpcStatus,
  isEcmaError,
}
