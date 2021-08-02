import https from 'https'
import http from 'http'

import { v4 } from 'uuid'

import {
  DEFAULT_AUTHORITY,
  log,
}                     from './config'

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

  public authority: string

  constructor (
    authority?: string,
  ) {
    log.verbose('WechatyToken', 'constructor(%s)', authority)

    if (!authority) {
      log.silly('WechatyToken', 'constructor() authority not set, use the default value "%s"', DEFAULT_AUTHORITY)
    }
    this.authority = authority || DEFAULT_AUTHORITY
  }

  async discover (token: string): Promise<undefined | PuppetServiceAddress> {
    log.verbose('WechatyToken', 'discover(%s)', token)

    const url = `https://${this.authority}/v0/hosties/${token}`

    const jsonStr = await new Promise<undefined | string>((resolve, reject) => {
      const httpClient = /^https:\/\//.test(url) ? https : http
      httpClient.get(url, function (res) {
        /**
          * Token service discovery fail: not exist
          */
        if (/^4/.test(String(res.statusCode))) {
          resolve(undefined)  // 4XX NotFound
          return
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

    /**
      * Token service discovery: Not Found
      */
    if (!jsonStr) {
      return undefined
    }

    try {
      const result = JSON.parse(jsonStr) as PuppetServiceAddress
      return result

    } catch (e) {
      console.error([
        `wechaty-puppet-service: WechatyToken.discover(${token})`,
        'failed: unable to parse JSON str to object:',
        '----- jsonStr START -----',
        jsonStr,
        '----- jsonStr END -----',
      ].join('\n'))
    }

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
