/**
 * Wechaty - Wechat for Bot. Connecting ChatBots
 *
 * Licenst: ISC
 * https://github.com/wechaty/wechaty
 *
 */
import { test } from 'ava'

import {
    BrowserCookie,
} from './browser-cookie'

import { BrowserDriver }  from './browser-driver'

test('hostname() for wx.qq.com', async t => {
  const driver = <BrowserDriver>{}
  const browserCookie = new BrowserCookie(driver, 'test/fixture/profile/qq.wechaty.json')
  const hostname = await browserCookie.hostname()

  t.is(hostname, 'wx.qq.com', 'should get wx.qq.com')
})

test('hostname() for wechat.com', async t => {
  const driver = <BrowserDriver>{}
  const browserCookie = new BrowserCookie(driver, 'test/fixture/profile/wechat.wechaty.json')
  const hostname = await browserCookie.hostname()

  t.is(hostname, 'web.wechat.com', 'should get web.wechat.com')
})

test('hostname() for default', async t => {
  const driver = <BrowserDriver>{}
  const browserCookie = new BrowserCookie(driver)
  const hostname = await browserCookie.hostname()

  t.is(hostname, 'wx.qq.com', 'should get wx.qq.com')
})

test('hostname() for file not exist', async t => {
  const driver = <BrowserDriver>{}
  const browserCookie = new BrowserCookie(driver, 'file-not-exist.wechaty.json')
  const hostname = await browserCookie.hostname()

  t.is(hostname, 'wx.qq.com', 'should get wx.qq.com for non exist file')
})
