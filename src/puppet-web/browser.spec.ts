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

test('quit()', async t => {
  const browser = new Browser()
  await browser.driver.init() // init driver, not init browser

  t.throws(browser.quit(), Error, 'should throw on an un-inited browser')

  browser.state.target('open')
  browser.state.current('open', false)
  t.notThrows(browser.quit(), 'should not throw exception when call quit() on an `inprocess` `open` state browser')

  browser.state.target('close')
  browser.state.current('close')
  t.throws(browser.quit(), Error, 'should throw exception when call quit() twice on browser')

})

test('init()', async t => {
  const browser = new Browser()
  browser.state.target('open')

  browser.state.current('open')
  t.throws(browser.init(), Error, 'should throw exception when call init() on an `open` state browser')

  browser.state.current('open', false)
  t.throws(browser.init(), Error, 'should throw exception when call init() on a `open`-`ing` state browser')
})
