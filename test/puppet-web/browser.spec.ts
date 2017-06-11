/**
 *   Wechaty - https://github.com/chatie/wechaty
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
import * as fs  from 'fs'
import { test } from 'ava'

import {
  Config,
  log,
}               from '../../'

import {
  Browser,
}               from '../../src/puppet-web/'

const PROFILE = Config.DEFAULT_PROFILE + '-' + process.pid + '-'
let profileCounter = 1

test('Cookie smoke testing', async t => {
  const browser = new Browser()
  t.truthy(browser, 'should instanciate a browser instance')

  browser.state.target('open')
  browser.hostname = 'wx.qq.com'

  await browser.driver.init()
  t.pass('should init driver')

  await browser.open()
  t.pass('should opened')

  browser.state.current('open')

  const two = await browser.execute('return 1+1')
  t.is(two, 2, 'should got 2 after execute script 1+1')

  let cookies = await browser.driver.manage().getCookies()
  t.truthy(cookies.length, 'should got plenty of cookies')

  await browser.driver.manage().deleteAllCookies()
  cookies = await browser.driver.manage().getCookies()
  t.is(cookies.length, 0, 'should no cookie anymore after deleteAllCookies()')

  const EXPECTED_COOKIES = [{
    name: 'wechaty0',
    value: '8788-0',
    path: '/',
    domain: '.qq.com',
    secure: false,
    expiry: 99999999999999,
  },
  {
    name: 'wechaty1',
    value: '8788-1',
    path: '/',
    domain: '.qq.com',
    secure: false,
    expiry: 99999999999999,
  }]

  await browser.addCookie(EXPECTED_COOKIES)
  const tt = await browser.readCookie()
  await Promise.all(tt)

  cookies = await browser.driver.manage().getCookies()
  const cookies0 = cookies.filter(c => { return RegExp(EXPECTED_COOKIES[0].name).test(c.name) })
  t.is(cookies0[0].name, EXPECTED_COOKIES[0].name, 'getCookies() should filter out the cookie named wechaty0')
  const cookies1 = cookies.filter(c => { return RegExp(EXPECTED_COOKIES[1].name).test(c.name) })
  t.truthy(cookies1, 'should get cookies1')
  t.is(cookies1[0].name, EXPECTED_COOKIES[1].name, 'getCookies() should filter out the cookie named wechaty1')

  await browser.open()
  t.pass('re-opened url')
  const cookieAfterOpen = await browser.driver.manage().getCookie(EXPECTED_COOKIES[0].name)
  t.is(cookieAfterOpen.name, EXPECTED_COOKIES[0].name, 'getCookie() should get expected cookie named after re-open url')

  const dead = browser.dead()
  t.is(dead, false, 'should be a not dead browser')

  const live = await browser.readyLive()
  t.is(live, true, 'should be a live browser')

  await browser.driver.quit()
})

test('Cookie save/load', async t => {
  const profileName = PROFILE + (profileCounter++)

  let browser = new Browser({
      head: Config.head,
      sessionFile: profileName,
  })

  /**
   * use exception to call b.quit() to clean up
   */
  try {
    t.truthy(browser, 'should get a new Browser')

    browser.state.target('open')
    browser.hostname = 'wx.qq.com'

    await browser.driver.init()
    t.pass('should init driver')

    await browser.open()
    t.pass('opened')

    const EXPECTED_COOKIE = {
      name: 'wechaty_save_to_session',
      value: '### This cookie should be saved to session file, and load back at next PuppetWeb init  ###',
      path: '/',
      domain: '.wx.qq.com',
      secure: false,
      expiry: 99999999999999,
    }
    const EXPECTED_NAME_REGEX = new RegExp('^' + EXPECTED_COOKIE.name + '$')

    await browser.driver.manage().deleteAllCookies()
    const cookies = await browser.driver.manage().getCookies()
    t.is(cookies.length, 0, 'should no cookie after deleteAllCookies()')

    await browser.addCookie(EXPECTED_COOKIE)
    const cookieFromBrowser = await browser.driver.manage().getCookie(EXPECTED_COOKIE.name)
    t.is(cookieFromBrowser.name, EXPECTED_COOKIE.name, 'cookie from getCookie() should be same as we just set')

    let cookiesFromCheck = await browser.readCookie()
    t.truthy(cookiesFromCheck.length, 'should get cookies from checkSession() after addCookies()')
    let cookieFromCheck  = cookiesFromCheck.filter(c => EXPECTED_NAME_REGEX.test(c['name']))
    t.is(cookieFromCheck[0]['name'], EXPECTED_COOKIE.name, 'cookie from checkSession() return should be same as we just set by addCookies()')

    await browser.saveCookie()
    const cookiesFromSave = await browser.readCookie()
    t.truthy(cookiesFromSave.length, 'should get cookies from saveSession()')
    const cookieFromSave  = cookiesFromSave.filter(c => EXPECTED_NAME_REGEX.test(c['name']))
    t.is(cookieFromSave.length, 1, 'should has the cookie we just set')
    t.is(cookieFromSave[0]['name'], EXPECTED_COOKIE.name, 'cookie from saveSession() return should be same as we just set')

    await browser.driver.manage().deleteAllCookies()
    cookiesFromCheck = await browser.readCookie()
    t.is(cookiesFromCheck.length, 0, 'should no cookie from checkSession() after deleteAllCookies()')

    await browser.loadCookie().catch(() => { /* fail safe */ })
    const cookiesFromLoad = await browser.readCookie()
    t.truthy(cookiesFromLoad.length, 'should get cookies after loadSession()')
    const cookieFromLoad = cookiesFromLoad.filter(c => EXPECTED_NAME_REGEX.test(c.name))
    t.is(cookieFromLoad[0].name, EXPECTED_COOKIE.name, 'cookie from loadSession() should has expected cookie')

    cookiesFromCheck = await browser.readCookie()
    t.truthy(cookiesFromCheck.length, 'should get cookies from checkSession() after loadSession()')
    cookieFromCheck  = cookiesFromCheck.filter(c => EXPECTED_NAME_REGEX.test(c['name']))
    t.truthy(cookieFromCheck.length, 'should has cookie after filtered after loadSession()')
    t.is(cookieFromCheck[0]['name'], EXPECTED_COOKIE.name, 'cookie from checkSession() return should has expected cookie after loadSession')

    await browser.driver.quit()
    t.pass('quited')

    /**
     * start new browser process
     * with the same sessionFile: profileName
     */

    browser = new Browser({
      head: Config.head,
      sessionFile: profileName,
    })

    t.pass('should started a new Browser')

    browser.state.target('open')
    browser.hostname = 'wx.qq.com'

    await browser.driver.init()
    t.pass('should inited the new Browser')
    await browser.open()
    t.pass('should opened')

    await browser.loadCookie()
    t.pass('should loadSession for new Browser(process)')

    const cookieAfterQuit = await browser.driver.manage().getCookie(EXPECTED_COOKIE.name)
    t.truthy(cookieAfterQuit, 'should get cookie from getCookie()')
    t.is(cookieAfterQuit.name, EXPECTED_COOKIE.name, 'cookie from getCookie() after browser quit, should load the right cookie back')

    fs.unlink(profileName, err => { // clean
      if (err) {
        log.warn('Browser', 'unlink session file %s fail: %s', PROFILE, err)
      }
    })

    await browser.driver.quit()
  } catch (e) {
    if (browser) {
      await browser.driver.quit()
    }
    t.fail('exception: ' + e.message)
  }
})
