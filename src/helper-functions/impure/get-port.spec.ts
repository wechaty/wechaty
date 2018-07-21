#!/usr/bin/env ts-node
/**
 *   Wechaty - https://github.com/chatie/wechaty
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

// import http      from 'http'
import express   from 'express'

import { getPort } from './get-port'

test('getPort() for an available socket port', async t => {
  const PORT = 8788

  let port = await getPort(PORT)
  let ttl = 17

  const serverList = []

  while (ttl-- > 0) {
    try {
      const app = express()
      const server = app.listen(port)
      port = await getPort(PORT)

      serverList.push(server)
    } catch (e) {
      t.fail('should not exception: ' + e.message + ', ' + e.stack)
    }
  }
  serverList.map(server => server.close())
  t.pass('should has no exception after loop test')
})
