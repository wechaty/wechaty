import { test } from 'ava'

import {
  // PuppetWeb
  // , log
} from '../../'

import {
    Event
  , PuppetWeb
} from '../../src/puppet-web/'

// const PORT = process.env.WECHATY_PORT || 58788
const PROFILE = 'unit-test-session.wechaty.json'

// const PuppetWeb = require('../../src/puppet-web')

test('Puppet Web Event smoking test', async t => {
  let pw = new PuppetWeb({profile: PROFILE})
  t.truthy(pw, 'should instantiated a PuppetWeb')

  await pw.init()
  t.pass('should be inited')

  await Event.onBrowserDead.call(pw, 'event unit test')
  t.pass('should finish onBrowserDead event process')

  await pw.quit()
})
