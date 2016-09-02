import path from 'path'

import { test } from 'ava'

import {
  Browser
  , By
} from 'selenium-webdriver'

import {
  PuppetWeb
  , log
} from '../'

// 'use strict'

// const path  = require('path')
// const co    = require('co')
// const test   = require('tape')

// const log   = require('../src/npmlog-env')

// const WebDriver = require('selenium-webdriver')
// const Browser = WebDriver.Browser
// const By = WebDriver.By

// const PuppetWebBrowser  = require('../src/puppet-web/browser')
// const PuppetWebBridge   = require('../src/puppet-web/bridge')

/**
 * WHY USE test.serial
 * 
 * serial here is because we are checking browser pids inside test.
 * if 2 tests run parallel in the same process,
 * there will have race conditions for the conflict
 */ 
test.serial('WebDriver process create & quit test', async t => {
  // co(function* () {
    const b = new PuppetWeb.Browser()
    t.truthy(b, 'should instanciate a browser')

    await b.init()
    t.pass('should be inited successful')
    await b.open()
    t.pass('should open successful')

    let pids = await b.getBrowserPids()
    t.truthy(pids.length > 0, 'should exist browser process after b.open()')

// console.log(b.driver.getSession())

    await b.quit()
    t.pass('quited')

    const useAva = true
    if (!useAva) { // ava will run tests concurency...
      pids = await b.getBrowserPids()
      t.is(pids.length, 0, 'no driver process after quit')
    }

  // })
  // .catch(e => t.fail(e))
  // .then(_ => t.end())

  // return
})

test.serial('WebDriver smoke testing', async t => {
  const wb = new PuppetWeb.Browser()
  t.truthy(wb, 'Browser instnace')

  const mockPuppet = {browser: wb}
  const bridge = new PuppetWeb.Bridge({puppet: mockPuppet})
  t.truthy(bridge, 'Bridge instnace')

  var driver // for help function `execute`

  // co(function* () {
    const m = (await wb.getBrowserPids()).length
    t.is(m, 0, 'should has no browser process before get()')

    driver = await wb.initDriver()
    t.truthy(driver, 'should init driver success')

    const injectio = bridge.getInjectio()
    t.truthy(injectio.length > 10, 'should got injectio script')

    // XXX: if get rid of this dummy,
    // driver.get() will fail due to cant start phantomjs process
    // 20160828 fixed in new version of selenium webdriver
    // await Promise.resolve()

    await driver.get('https://wx.qq.com/')
    t.pass('should open wx.qq.com')

    const n = (await wb.getBrowserPids()).length
    // console.log(n)
    // await new Promise((resolve) => {
    //   setTimeout(() => {
    //     resolve()
    //   }, 3000)
    // })
    t.truthy(n > 0, 'should exist browser process after get()')

    const retAdd = await driverExecute('return 1+1')
    t.is(retAdd, 2, 'should return 2 for execute 1+1 in browser')

    const retInject = await driverExecute(injectio, 8788)
    t.truthy(retInject, 'should return a object contains status of inject operation')
    t.is(retInject.code, 200, 'should got code 200 for a success wechaty inject')

    await wb.quit()
  // })
  // .catch(e => t.fail('promise rejected. e:' + e)) // Rejected
  // .then(_ => {                                    // Finally
  //   wb.quit()
  //   .then(_ => t.end())
  // })
  // .catch(e => t.fail(e))                          // Exception

  return

  //////////////////////////////////
  function driverExecute() {
    return driver.executeScript.apply(driver, arguments)
  }
})
