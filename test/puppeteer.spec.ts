#!/usr/bin/env ts-node
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
import * as fs    from 'fs'
import * as path  from 'path'

// tslint:disable:no-shadowed-variable
import * as test  from 'blue-tape'
import * as sinon from 'sinon'

import {
  Cookie,
  launch,
}                 from 'puppeteer'

const PUPPETEER_LAUNCH_OPTIONS = {
  headless: true,
  args: [
    '--disable-gpu',
    '--disable-setuid-sandbox',
    '--no-sandbox',
  ],
}

test('Puppeteer smoke testing', async t => {
  let browser, page
  try {
    browser = await launch(PUPPETEER_LAUNCH_OPTIONS)
    t.ok(browser, 'Browser instnace')

    const version = await browser.version()
    t.ok(version, 'should get version')

    page = await browser.newPage()
    await page.goto('https://wx.qq.com/')
    t.pass('should open wx.qq.com')

    const result = await page.evaluate(() => 42)
    t.is(result as any, 42, 'should get 42')

  } catch (e) {
    t.fail(e && e.message || e)
  } finally {
    if (page) {
      await page.close()
    }
    if (browser) {
      await browser.close()
    }
  }
})

test('evaluate() a function that returns a Promise', async t => {
  try {
    const browser = await launch(PUPPETEER_LAUNCH_OPTIONS)
    const page    = await browser.newPage()

    const result = await page.evaluate(() => Promise.resolve(42))
    t.equal(result, 42, 'should get resolved value of promise inside browser')

    await page.close()
    await browser.close()
  } catch (e) {
    t.fail(e && e.message || e)
  }
})

test('evaluate() a file and get the returns value', async t => {
  const EXPECTED_OBJ = {
    code: 42,
    message: 'meaning of the life',
  }

  try {
    const browser = await launch(PUPPETEER_LAUNCH_OPTIONS)
    const page = await browser.newPage()

    const file = path.join(
      __dirname,
      'fixture/inject-file.js',
    )
    const source = fs.readFileSync(file).toString()

    const result = await page.evaluate(source)
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

test('page.on(console)', async t => {
  const EXPECTED_ARG1 = 'arg1'
  const EXPECTED_ARG2 = 2
  // const EXPECTED_ARG3 = { arg3: 3 }

  const browser = await launch(PUPPETEER_LAUNCH_OPTIONS)
  const page    = await browser.newPage()

  const spy = sinon.spy()

  page.on('console', spy)
  await page.evaluate((...args) => {
    console.log.apply(console, args)
  }, EXPECTED_ARG1, EXPECTED_ARG2) // , EXPECTED_ARG3)

  // wait a while to let chrome fire the event
  await new Promise(r => setTimeout(r, 3))

  t.ok(spy.calledOnce, 'should be called once')

  const consoleMessage = spy.firstCall.args[0]
  t.equal(consoleMessage.type(), 'log', 'should get log type')
  t.equal(consoleMessage.text(), EXPECTED_ARG1 + ' ' + EXPECTED_ARG2, 'should get console.log 1st/2nd arg')

  await page.close()
  await browser.close()
})

test('page.exposeFunction()', async t => {
  const browser = await launch(PUPPETEER_LAUNCH_OPTIONS)
  const page    = await browser.newPage()

  const spy = sinon.spy()

  await page.exposeFunction('nodeFunc', spy)
  await page.evaluate(`nodeFunc(42)`)
  t.ok(spy.calledOnce, 'should be called once inside browser')
  t.equal(spy.firstCall.args[0], 42, 'should be called with 42')

  await page.close()
  await browser.close()
})

test('other demos', async t => {
  const EXPECTED_URL = 'https://www.zixia.net/'

  try {
    const browser = await launch(PUPPETEER_LAUNCH_OPTIONS)

    const version = await browser.version()
    t.ok(version, 'should get version')

    const page = await browser.newPage()
    await page.goto(EXPECTED_URL)
    // await page.goto('https://www.chromestatus.com/features', {waitUntil: 'networkidle'});
    // await page.waitForSelector('h3 a');
    // await page.click('input[type="submit"]');

    // not the same with the document of ConsoleMessage???

    page.on('dialog', async dialog => {
      console.log(dialog)
      console.log('dialog:', dialog.type, dialog.message())
      await dialog.accept('ok')
    })

    page.on('error', (e, ...args) => {
      console.error('error', e)
      console.error('error:args:', args)
    })
    page.on('pageerror', (e, ...args) => {
      console.error('pageerror', e)
      console.error('pageerror:args:', args)
    })

    page.on('load', (e, ...args) => {
      console.log('load:e:', e)
      console.log('load:args:', args)
    })

    // await page.setRequestInterception(true)
    page.on('request', interceptedRequest => {
      if (interceptedRequest.url().endsWith('.png')
        || interceptedRequest.url().endsWith('.jpg')
      ) {
        interceptedRequest.abort()
      } else {
        interceptedRequest.continue()
      }
    })

    page.on('requestfailed', (...args) => {
      console.log('requestfailed:args:', args)
    })

    page.on('response', (res, ...args) => {
      // console.log('response:res:', res)
      // console.log('response:args:', args)
    })

    // page.click(selector[, options])
    // await page.injectFile(path.join(__dirname, 'wechaty-bro.js'))
    const cookieList = await page.cookies() as any as Cookie[]
    t.ok(cookieList.length, 'should get cookies')
    t.ok(cookieList[0].name, 'should get cookies with name')

    const cookie: Cookie = {
      name:  'test-name',
      value: 'test-value',
      domain: 'qq.com',
      path: '/',
      expires: 1234324132,
      httpOnly: false,
      secure: false,
      sameSite: 'Strict',
    }
    await page.setCookie(cookie)

    const result = await page.evaluate(() => 8 * 7)
    t.equal(result, 56, 'should evaluated function for () => 8 * 7 = 56')

    t.equal(await page.evaluate('1 + 2'), 3, 'should evaluated 1 + 2 = 3')

    const url = await page.url()
    t.equal(url, EXPECTED_URL, 'should get the url right')
    // await new Promise(r => setTimeout(r, 3000))

    await page.close()
    await browser.close()
  } catch (e) {
    t.fail(e)
  }
})
