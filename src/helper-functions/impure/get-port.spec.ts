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

import net from 'net'

import { getPort } from './get-port'

test('getPort() for an available socket port', async t => {
  let port = await getPort()
  let ttl = 17

  const serverList = []

  while (ttl-- > 0) {
    try {
      const server = net.createServer(socket => {
        console.info(socket)
      })
      await new Promise(resolve => server.listen(port, resolve))
      serverList.push(server)

      port = await getPort()

    } catch (e) {
      t.fail('should not exception: ' + e.message + ', ' + e.stack)
    }
  }
  serverList.map(server => server.close())
  t.pass('should has no exception after loop test')
})
