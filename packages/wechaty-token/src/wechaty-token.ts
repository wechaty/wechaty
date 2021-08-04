import https from 'https'
import http from 'http'

import { v4 } from 'uuid'

import {
  DEFAULT_AUTHORITY,
  log,
}                     from './config'

import {
  VERSION,
}                     from './version'

import {
  Policy,
  RetryPolicy,
}                       from 'cockatiel'

interface PuppetServiceAddress {
  host: string,
  port: number,
}

type WechatyTokenType = 'uuid'
                      | 'wxwork'
                      | 'donut'
                      | 'padlocal'
                      | 'paimon'
                      | 'xp'
                      | string

class WechatyToken {

  static VERSION = VERSION
  version () {
    return VERSION
  }

  public authority: string

  /**
    * Create a retry policy that'll try whatever function we execute 3
    *  times with a randomized exponential backoff.
    *
    * https://github.com/connor4312/cockatiel#policyretry
    */
  private retry: RetryPolicy

  constructor (
    authority?: string,
  ) {
    log.verbose('WechatyToken', 'constructor(%s)', authority)

    if (!authority) {
      log.silly('WechatyToken', 'constructor() authority not set, use the default value "%s"', DEFAULT_AUTHORITY)
    }
    this.authority = authority || DEFAULT_AUTHORITY

    this.retry = Policy
      .handleAll()
      .retry()
      .attempts(3)
      .exponential()

    this.initRetry()
  }

  private initRetry () {
    this.retry.onRetry(reason => log.silly('WechatyToken',
      'constructor() this.retry.onRetry() reason: "%s"',
      JSON.stringify(reason),
    ))
    this.retry.onSuccess(({ duration }) => log.silly('WechatyToken',
      'initRetry() onSuccess(): retry call ran in %s ms',
      duration,
    ))
  }

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

  async discover (token: string): Promise<undefined | PuppetServiceAddress> {
    log.verbose('WechatyToken', 'discover(%s)', token)

    const url = `https://${this.authority}/v0/hosties/${token}`

    let jsonStr: undefined | string

    try {
      jsonStr = await this.retry.execute(
        () => this.discoverApi(url)
      )
    } catch (e) {
      log.warn('WechatyToken', 'discover() retry.execute(discoverApi) fail: %s', e.message)
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
        `WechatyToken.discover(${token})`,
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

  generate (type: WechatyTokenType = 'uuid'): string {
    log.verbose('WechatyToken', 'generate(%s)', type)
    switch (type) {
      case 'uuid':
        return v4()

      default:
        return `puppet_${type}_${v4()}`
    }
  }

}

export { WechatyToken }
