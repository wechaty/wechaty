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
import { test }  from 'tstest'

import jsonRpcPeer from 'json-rpc-peer'

import {
  getPeer,
}                   from './io-peer.js'

test('getPeer()', async t => {
  const EXPECTED_PORT = 8788
  const server = getPeer({
    serviceGrpcPort: EXPECTED_PORT,
  })
  const client = new jsonRpcPeer.Peer()
  /**
   * FIXME: Huan(202108): remove `any` to fix the typing
   */
  server.pipe(client as any).pipe(server)

  /**
   * Huan(202101) Need to be fixed by new IO Bus system.
   *  See: https://github.com/wechaty/wechaty-puppet-service/issues/118
   */
  const port = await client.request('getHostieGrpcPort')
  t.equal(port, EXPECTED_PORT, 'should get the right port')
})

test('exec()', async t => {
  const EXPECTED_PORT = 8788
  const server = getPeer({
    serviceGrpcPort: EXPECTED_PORT,
  })

  /**
   * Huan(202101) Need to be fixed by new IO Bus system.
   *  See: https://github.com/wechaty/wechaty-puppet-service/issues/118
   */
  const request = jsonRpcPeer.format.request(42, 'getHostieGrpcPort')
  const response = await server.exec(request) as string
  // console.info('response: ', response)

  const obj = jsonRpcPeer.parse(response) as jsonRpcPeer.JsonRpcPayloadResponse
  t.equal(obj.result, EXPECTED_PORT, 'should get the right port from payload')
})
