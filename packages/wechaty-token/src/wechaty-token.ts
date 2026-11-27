/**
 * `WechatyToken`: a Wechaty puppet service token (`<sni>_<uuid>`) and its
 * service discovery. `discover()` uses Fetch to ask the discovery authority
 * (`https://<authority>/v0/hosties/<token>`, default `api.chatie.io`) for the
 * service's host and port, retrying transient failures (`retry-policy.ts`).
 * It resolves `undefined`, never rejects, when the token is unknown or the
 * service cannot be reached.
 */
import {
  DEFAULT_AUTHORITY,
  log,
}                     from './config.ts'
import {
  VERSION,
}                     from './version.ts'
import {
  retryPolicy,
}                     from './retry-policy.ts'

interface PuppetServiceAddress {
  host: string,
  port: number,
}

/**
 * Huan(202108): `insecure` is the default SNI for wechaty-puppet-service
 */
type WechatyTokenType = 'insecure'
                      | 'uuid'
                      | 'wxwork'
                      | 'donut'
                      | 'padlocal'
                      | 'paimon'
                      | 'xp'
                      | string

export interface WechatyTokenOptions {
  authority? : string
  token      : string
}

class WechatyToken {

  static VERSION = VERSION
  version () {
    return VERSION
  }

  /**
   * Wechaty Token is a UUID prefixed with the SNI concated with a `_`
   *
   * @example "uuid_63d6b063-01e5-48b9-86ed-9fa2c05a6930"
   */
  static generate (type: WechatyTokenType = 'uuid'): string {
    log.verbose('WechatyToken', 'generate(%s)', type)
    return type + '_' + crypto.randomUUID()
  }

  /**
   * Instance
   */

  public authority : string
  public sni?      : string
  public token     : string

  constructor (
    options: string | WechatyTokenOptions,
  ) {
    log.verbose('WechatyToken', 'constructor(%s)', JSON.stringify(options))

    if (typeof options === 'string') {
      this.token = options
      this.authority = DEFAULT_AUTHORITY
    } else {
      if (!options.authority) {
        log.silly('WechatyToken', 'constructor() `options.authority` not set, use the default value "%s"', DEFAULT_AUTHORITY)
      }
      this.token = options.token
      this.authority = options.authority || DEFAULT_AUTHORITY
    }

    const underscoreIndex = this.token.lastIndexOf('_')
    if (underscoreIndex > 0) {
      this.sni = this.token
        .slice(0, underscoreIndex)
        .toLowerCase()
    }
  }

  toString () { return this.token }

  /** Reads the discovery response, treating 4xx responses as terminal misses. */
  private async discoverApi (url: string, signal?: AbortSignal): Promise<undefined | string> {
    // Each lookup goes to the named authority without cookies, redirects, or cached addresses.
    const response = await fetch(url, {
      cache       : 'no-store',
      credentials : 'omit',
      redirect    : 'manual',
      signal,
    })

    if (response.ok) {
      return response.text()
    }

    // A failed request needs no response body. Cancel it to release the connection.
    void response.body?.cancel().catch(() => {})
    if (response.status >= 400 && response.status < 500) {
      return undefined
    }

    const error = new Error(`Unknown error: HTTP/${response.status}`)
    log.warn('WechatyToken', 'discoverApi() %s', error.message)
    throw error
  }

  /** Resolves the service address when discovery returns a usable response. */
  async discover (signal?: AbortSignal): Promise<undefined | PuppetServiceAddress> {
    log.verbose('WechatyToken', 'discover() for "%s"', this.token)
    signal?.throwIfAborted()

    const url = `https://${this.authority}/v0/hosties/${this.token}`

    let jsonStr: undefined | string

    try {
      jsonStr = await retryPolicy.execute(
        context => this.discoverApi(url, context.signal),
        signal,
      )
    } catch (e) {
      if (signal?.aborted) {
        throw signal.reason
      }
      log.warn('WechatyToken', 'discover() retry.execute(discoverApi) fail: %s', (e as Error).message)
      // console.error(e)
      return undefined
    }

    /**
     * Token service discovery: Not Found
     */
    if (!jsonStr) {
      return undefined
    }

    try {
      const result = JSON.parse(jsonStr) as PuppetServiceAddress
      if (result.host && result.port) {
        return result
      }

    } catch (e) {
      console.error([
        `WechatyToken.discover() for "${this.token}"`,
        'failed: unable to parse JSON str to object:',
        '----- jsonStr START -----',
        jsonStr,
        '----- jsonStr END -----',
      ].join('\n'))
      console.error(e)
      return undefined
    }

    log.warn('WechatyToken', 'discover() address is malformed: "%s"', jsonStr)
    return undefined
  }

}

export { WechatyToken }
