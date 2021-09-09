#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
/**
 *   Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
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
import { test } from 'tstest'
import { timestampToDate } from './timestamp-to-date.js'

/**
 * 1e11
 *   in milliseconds:  Sat Mar 03 1973 09:46:39 UTC
 *   in seconds:       Wed Nov 16 5138 9:46:40 UTC
 */
test('timestampToDate() for dealing with seconds', async t => {
  const SECONDS = 1e11 - 1
  const EXPECTED_DATE_NOW = 'Wed, 16 Nov 5138 09:46:39 GMT'

  const date = timestampToDate(SECONDS)
  t.equal(date.toUTCString(), EXPECTED_DATE_NOW, 'should parse seconds to right date')
})

test('timestampToDate() for dealing with milliseconds', async t => {
  const MILLISECONDS = 1e11 + 1
  const EXPECTED_DATE_UTC = 'Sat, 03 Mar 1973 09:46:40 GMT'

  const date = timestampToDate(MILLISECONDS)
  t.equal(date.toUTCString(), EXPECTED_DATE_UTC, 'should parse milliseconds to right date')
})
