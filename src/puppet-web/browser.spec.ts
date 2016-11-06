/**
 * Wechaty - Wechat for Bot. Connecting ChatBots
 *
 * Licenst: ISC
 * https://github.com/wechaty/wechaty
 *
 */
import { test } from 'ava'

import {
  //   Config
  // , log
} from '../config'

import {
    Browser
} from './browser'

test.skip('quit()', async t => {
  const browser = new Browser()
  await browser.driver.init()

  t.notThrows(async () => {
    try {
      await browser.quit()
    } catch(e) {
      throw e
    }
  }, 'should throw exception when call quit() on an un-init-ed browser')

  t.throws(() => {
    throw new Error('test')
  }, Error, 'ok')
  // browser.state.current('open', false)

  // t.notThrows(() => {
  //   browser.quit()
  // }, 'should not throw exception when call quit() on an `inprocess` `open` state browser')

  // t.throws(() => {
  //   browser.quit()
  // }, Error, 'should throw exception when call quit() twice on browser')

})
