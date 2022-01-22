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
import {
  test,
  sinon,
}             from 'tstest'

import * as PUPPET from 'wechaty-puppet'
import PuppetMock from 'wechaty-puppet-mock'
import { FileBox } from 'file-box'

import { WechatyBuilder } from '../wechaty-builder.js'

test.skip('Post smoke testing', async t => {
  void sinon

  const puppet = new PuppetMock()
  const wechaty = WechatyBuilder.build({ puppet })
  await wechaty.start()
  const bot = puppet.mocker.createContact({ name: 'Bot' })
  puppet.mocker.login(bot)

  const post = await wechaty.Post.builder()
    .add('Hello, world!')
    .add(FileBox.fromQRCode('qr'))
    .add(await wechaty.UrlLink.create('https://yahoo.com'))
    .build()

  await wechaty.say(post)

  await post.reply('Thanks for sharing!')
  await post.like(true)
  await post.tap(PUPPET.types.Tap.Like, false)

  const pagination = {
    pageSize: 10,
    pageToken: '',
  }

  for await (const sayable of post) {
    t.ok(sayable, 'tbw')
  }

  for await (const descendantPost of post.descendants()) {
    t.ok(descendantPost, 'tbw')
  }

  const [descendantList, _nextPageToken2] = await wechaty.Post.findAll({}, pagination)
  t.ok(descendantList, 'tbw')

  for await (const liker of post.taps({ type: PUPPET.types.Tap.Like })) {
    t.ok(liker, 'tbw')
  }

  const [tapList, _nextPageToken3] = await post.tapFind({ type: PUPPET.types.Tap.Like }, pagination)
  t.ok(tapList, 'tbw')

  await wechaty.stop()
})
