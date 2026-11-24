/**
 * Server-side token check for the puppet ConnectRPC service.
 * `authImplToken(validToken)` returns a ConnectRPC `Interceptor` that validates
 * incoming requests against `Authorization: Wechaty <token>` or `Authorization: Bearer <token>`,
 * rejecting unauthorized calls with Code.Unauthenticated.
 */
import {
  type Interceptor,
  ConnectError,
  Code,
} from '@connectrpc/connect'
import { log } from 'wechaty-puppet'

export function authImplToken (validToken: string): Interceptor {
  log.verbose('wechaty-puppet-service', 'auth/auth-impl-token.ts authImplToken(%s)', validToken)

  return (next) => async (req) => {
    const authHeader = req.header.get('authorization')
    let token = ''

    if (authHeader) {
      if (authHeader.startsWith('Wechaty ')) {
        token = authHeader.substring(8)
      } else if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      } else {
        token = authHeader
      }
    } else {
      const authority = req.header.get('authority') || req.header.get('host')
      if (authority) {
        token = authority
      }
    }

    if (token !== validToken) {
      throw new ConnectError('unauthenticated', Code.Unauthenticated)
    }

    return await next(req)
  }
}
