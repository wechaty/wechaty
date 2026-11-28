/**
 * Server-side token check for the puppet ConnectRPC service.
 * `authImplToken(validToken)` returns a ConnectRPC `Interceptor` that validates
 * incoming requests using constant-time comparison against `Authorization`
 * (`Bearer` / `Wechaty`), `x-wechaty-token`, or legacy `:authority`/`host` headers,
 * rejecting unauthorized calls with `Code.Unauthenticated`.
 */
import {
  type Interceptor,
  ConnectError,
  Code,
} from '@connectrpc/connect'
import { log } from 'wechaty-puppet'

import { verifyTokenFromHeaders } from './verify-token.ts'

export function authImplToken (validToken: string): Interceptor {
  log.verbose('wechaty-puppet-service', 'auth/auth-impl-token.ts authImplToken(%s)', validToken)

  return (next) => async (req) => {
    if (!validToken || validToken.trim() === '') {
      throw new ConnectError('unauthenticated: server token is not configured', Code.Unauthenticated)
    }

    if (!verifyTokenFromHeaders(req.header, validToken)) {
      throw new ConnectError('unauthenticated', Code.Unauthenticated)
    }

    return await next(req)
  }
}
