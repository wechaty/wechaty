#!/usr/bin/env ts-node
/**
 *   Wechaty - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016-2018 Huan LI <zixia@zixia.net>
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
// tslint:disable:no-shadowed-variable
import test  from 'blue-tape'
import sinon from 'sinon'

import { tryWait } from './try-wait'
import promiseRetry = require('promise-retry')

test('promiseRetry()', async t => {
  const EXPECTED_RESOLVE = 'Okey'
  const EXPECTED_REJECT  = 'NotTheTime'

  function delayedFactory (timeout: number) {
    const startTime = Date.now()
    return () => {
      const nowTime = Date.now()
      if (nowTime - startTime > timeout) {
        return Promise.resolve(EXPECTED_RESOLVE)
      }
      return Promise.reject(EXPECTED_REJECT)
    }
  }

  const thenSpy = sinon.spy()

  const delay500 = delayedFactory(500)
  await promiseRetry(
    {
      minTimeout : 1,
      retries    : 1,
    },
    (retry) => {
      return delay500().catch(retry)
    },
  ).catch((e: any) => {
    thenSpy(e)
  })
  t.true(thenSpy.withArgs(EXPECTED_REJECT).calledOnce, 'should got EXPECTED_REJECT when wait not enough')

  thenSpy.resetHistory()
  const anotherDelay50 = delayedFactory(50)
  await promiseRetry(
    {
      minTimeout: 1,
      retries: 100,
    },
    (retry) => {
      return anotherDelay50().catch(retry)
    },
  )
    .then((r: string) => {
      return thenSpy(r)
    })
  t.true(thenSpy.withArgs(EXPECTED_RESOLVE).calledOnce, 'should got EXPECTED_RESOLVE when wait enough')
})

test('retry()', async t => {
  const EXPECTED_RESOLVE = 'Okey'
  const EXPECTED_REJECT  = 'NotTheTime'

  function delayedFactory (timeout: number) {
    const startTime = Date.now()
    return () => {
      const nowTime = Date.now()
      if (nowTime - startTime > timeout) {
        return Promise.resolve(EXPECTED_RESOLVE)
      }
      return Promise.reject(EXPECTED_REJECT)
    }
  }

  const thenSpy = sinon.spy()

  const anotherDelay50 = delayedFactory(50)
  await tryWait(
    (retry) => {
      return anotherDelay50().catch(retry)
    },
  )
    .then((r: string) => {
      return thenSpy(r)
    })
  t.true(thenSpy.withArgs(EXPECTED_RESOLVE).calledOnce, 'should got EXPECTED_RESOLVE when wait enough')
})
