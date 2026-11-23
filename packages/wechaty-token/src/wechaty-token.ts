import https from 'https'
import http from 'http'

import { v4 } from 'uuid'

import {
  DEFAULT_AUTHORITY,
  log,
}                     from './config.js'
import {
  VERSION,
}                     from './version.js'
import {
  retryPolicy,
}                     from './retry-policy.js'

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
    return type + '_' + v4()
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

  private discoverApi (url: string): Promise<undefined | string> {
    return new Promise<undefined | string>((resolve, reject) => {
      const httpClient = /^https:\/\//.test(url) ? https : http
      httpClient.get(url, function (res) {
        if (/^4/.test('' + res.statusCode)) {
          /**
            * 4XX Not Found: Token service discovery fail: not exist
            */
          return resolve(undefined)  // 4XX NotFound
        } else if (!/^2/.test(String(res.statusCode))) {
          /**
           * Non-2XX: unknown error
           */
          const e = new Error(`Unknown error: HTTP/${res.statusCode}`)
          log.warn('WechatyToken', 'discoverApi() httpClient.get() %s', e.message)
          return reject(e)
        }

        let body = ''
        res.on('data', function (chunk) {
          body += chunk
        })
        res.on('end', function () {
          resolve(body)
        })

      }).on('error', function (e) {
        console.error(e)
        reject(new Error(`WechatyToken discover() endpoint<${url}> rejection: ${e}`))
      })
    })
  }

  async discover (): Promise<undefined | PuppetServiceAddress> {
    log.verbose('WechatyToken', 'discover() for "%s"', this.token)

    const url = `https://${this.authority}/v0/hosties/${this.token}`

    let jsonStr: undefined | string

    try {
      jsonStr = await retryPolicy.execute(
        () => this.discoverApi(url),
      )
    } catch (e) {
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
