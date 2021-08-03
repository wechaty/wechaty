#!/usr/bin/env ts-node

// tslint:disable:no-shadowed-variable
import { test }  from 'tstest'

import { GET_WECHATY_PUPPET_SERVICE_AUTHORITY } from './config'

/**
 * Huan(202108): compatible with old env var
 *  See: https://github.com/wechaty/wechaty-puppet-service/issues/156
 */
test('GET_WECHATY_PUPPET_SERVICE_AUTHORITY()', async t => {
  const oldValue = process.env['WECHATY_SERVICE_DISCOVERY_ENDPOINT']
  process.env['WECHATY_SERVICE_DISCOVERY_ENDPOINT'] = 'https://api.chatie.io'

  const result = GET_WECHATY_PUPPET_SERVICE_AUTHORITY()
  t.equal(result, 'api.chatie.io', 'should extract authority')

  process.env['WECHATY_SERVICE_DISCOVERY_ENDPOINT'] = oldValue
})
