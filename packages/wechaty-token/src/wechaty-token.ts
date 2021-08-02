import { v4 } from 'uuid'

import {
  DEFAULT_AUTHORITY,
  log,
}                     from './config'

interface PuppetServerAddress {
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

  async discover (token: string): Promise<PuppetServerAddress> {
    log.verbose('WechatyToken', 'discover(%s)', token)
    return {
      host: '10.0.0.0',
      port: 10,
    }
  }

  generate (type: WechatyTokenType): string {
    log.verbose('WechatyToken', 'generate(%s)', type)
    switch (type) {
      case 'uuid':
        return v4()

      default:
        return `${type}_${v4()}`
    }
  }

}

export { WechatyToken }
