import { test } from 'ava'

import {
  PuppetWeb
  , log
} from '../../'

import util from 'util'

// const co    = require('co')
// const util  = require('util')
// const test  = require('tape')
// const retryPromise = require('retry-promise').default

// const log = require('../../src/npmlog-env')

const PORT = process.env.WECHATY_PORT || 58788
const PROFILE = 'unit-test-session.wechaty.json'

// const PuppetWeb = require('../../src/puppet-web')
const PuppetWebEvent = PuppetWeb.Event // require('../../src/puppet-web/event')

test('Puppet Web Event smoking test', async t => {
  let pw = new PuppetWeb({profile: PROFILE})
  t.truthy(pw, 'should instantiated a PuppetWeb')

  // co(function* () {
    await pw.init()
    t.pass('should be inited')

    await PuppetWebEvent.onBrowserDead.call(pw, 'event unit test')
    t.pass('should finish onBrowserDead event process')

    await pw.quit()
  // })
  // .catch(e => t.fail(e))  // Reject
  // .then(r => {            // Finally
  //   pw.quit()
  //   .then(_ => t.end())
  // })
  // .catch(e => t.fail(e))  // Exception
})
