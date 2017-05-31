/**
 * Wechaty - Wechat for Bot. Connecting ChatBots
 *
 * Licenst: ISC
 * https://github.com/wechaty/wechaty
 *
 */
import { test } from 'ava'

import {
  Event,
  PuppetWeb,
} from '../../src/puppet-web/'

// const PORT = process.env.WECHATY_PORT || 58788
const PROFILE = 'unit-test-session.wechaty.json'

test('Puppet Web Event smoke testing', async t => {
  const pw = new PuppetWeb({profile: PROFILE})
  t.truthy(pw, 'should instantiated a PuppetWeb')

  try {
    await pw.init()
    t.pass('should be inited')

    await Event.onBrowserDead.call(pw, 'event unit test')
    t.pass('should finish onBrowserDead event process')

    await pw.quit()
  } catch (e) {
    t.fail('exception: ' + e.message)
  }
})
