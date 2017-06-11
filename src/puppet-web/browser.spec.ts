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
import { test }     from 'ava'

import { Browser }  from './browser'

test.serial('quit()', async t => {
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

test.serial('init()', async t => {
  const browser = new Browser()
  browser.state.target('open')

  browser.state.current('open')
  t.throws(browser.init(), Error, 'should throw exception when call init() on an `open` state browser')

  browser.state.current('open', false)
  t.throws(browser.init(), Error, 'should throw exception when call init() on a `open`-`ing` state browser')

  await browser.quit()
  t.pass('should quited browser')
})
