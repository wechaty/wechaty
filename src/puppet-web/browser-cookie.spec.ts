/**
 *   Chatie - https://github.com/chatie
 *
 *   Copyright 2016-2017 Huan LI <zixia@zixia.net>
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
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
