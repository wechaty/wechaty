/**
 * Client-side token credentials: `callCredToken(token)` returns an Interceptor
 * that injects `authorization: Wechaty <token>` into outgoing ConnectRPC requests.
 */
import type { Interceptor } from '@connectrpc/connect'

export function callCredToken (token: string): Interceptor {
  return (next) => async (req) => {
    req.header.set('authorization', `Wechaty ${token}`)
    return await next(req)
  }
}
