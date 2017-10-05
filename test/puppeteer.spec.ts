/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2017 Huan LI <zixia@zixia.net>
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
import * as path from 'path'
// tslint:disable:no-shadowed-variable
import * as test from 'blue-tape'

import {
  launch,
}                 from 'puppeteer'

test('Puppeteer smoke testing', async t => {
  try {
    const browser = await launch()
    t.ok(browser, 'Browser instnace')

    const version = await browser.version()
    t.ok(version, 'should get version')

    const page = await browser.newPage()
    await page.goto('https://wx.qq.com/')
    t.pass('should open wx.qq.com')

    const result = await page.evaluate(() => 42)
    t.is(result as any, 42, 'should get 42')

    await page.close()
    await browser.close()
  } catch (e) {
    t.fail(e && e.message || e)
  }
})

test('evaluate() a function that returns a Promise', async t => {
  try {
    const browser = await launch()
    const page    = await browser.newPage()

    const result = await page.evaluate(() => Promise.resolve(42))
    t.equal(result, 42, 'should get resolved value of promise inside browser')

    await page.close()
    await browser.close()
  } catch (e) {
    t.fail(e && e.message || e)
  }
})

test('injectFile() a file and get the returns value', async t => {
  const EXPECTED_OBJ = {
    code: 42,
    message: 'meaning of the life',
  }

  try {
    const browser = await launch()
    const page = await browser.newPage()

    const result = await page.injectFile(path.join(
      __dirname,
      'fixture/inject-file.js',
    )) as any
    t.deepEqual(result, EXPECTED_OBJ, 'should inject file inside browser and return the value')

    const noWechaty = await page.evaluate('typeof WechatyBro === "undefined"')
    t.equal(noWechaty, true, 'should no wechaty by default')

    const hasWindow = await page.evaluate('typeof window === "object"')
    t.equal(hasWindow, true, 'should has window by default')

    await page.close()
    await browser.close()

  } catch (e) {
    t.fail(e && e.message || e)
  }
})
