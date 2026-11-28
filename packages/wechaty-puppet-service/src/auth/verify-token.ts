/**
 * Shared WinterTC-compatible constant-time token extraction and verification for
 * both ConnectRPC interceptors and plain-HTTP `fallback` routes (`/events`,
 * `/files`, `/files/:id`). Rejects URL query string tokens to avoid secret
 * leakage in proxy/access logs.
 */

export type HeaderLookup =
  | Headers
  | Record<string, string | string[] | undefined>

const encoder = new TextEncoder()

function readHeader (headers: HeaderLookup, name: string): string | undefined {
  if (headers instanceof Headers) {
    // Fetch Headers forbids HTTP/2 pseudo-headers such as ':authority'.
    if (name.startsWith(':')) {
      return undefined
    }
    return headers.get(name) ?? undefined
  }
  const value = headers[name] ?? headers[name.toLowerCase()]
  if (Array.isArray(value)) {
    return value[0]
  }
  return value
}

/**
 * Extract a Wechaty Puppet Service token from HTTP headers in precedence order:
 * 1. `Authorization: Bearer <token>` or `Authorization: Wechaty <token>` (or raw token)
 * 2. `x-wechaty-token: <token>`
 * 3. Legacy `:authority` / `authority` / `host` header fallback
 */
export function extractTokenFromHeaders (headers: HeaderLookup): string {
  const authHeader = readHeader(headers, 'authorization')?.trim()
  if (authHeader) {
    const match = authHeader.match(/^(?:Bearer|Wechaty)\s+(.+)$/i)
    return match?.[1]?.trim() ?? authHeader
  }

  const customToken = readHeader(headers, 'x-wechaty-token')?.trim()
  if (customToken) {
    return customToken
  }

  const authority =
    readHeader(headers, ':authority')
    ?? readHeader(headers, 'authority')
    ?? readHeader(headers, 'host')
  return authority?.trim() ?? ''
}

/**
 * Constant-time string comparison for authentication tokens using `TextEncoder`.
 */
export function isTokenValid (candidate: string, expected: string): boolean {
  if (!expected || expected.trim() === '' || !candidate || candidate.trim() === '') {
    return false
  }
  const a = encoder.encode(candidate)
  const b = encoder.encode(expected)
  if (a.length !== b.length) {
    return false
  }
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0)
  }
  return diff === 0
}

/**
 * Verify request headers against `expectedToken`.
 */
export function verifyTokenFromHeaders (
  headers: HeaderLookup,
  expectedToken: string,
): boolean {
  const candidate = extractTokenFromHeaders(headers)
  return isTokenValid(candidate, expectedToken)
}
