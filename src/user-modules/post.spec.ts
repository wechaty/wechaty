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

import { FileBox } from 'file-box'

import * as WECHATY from '../mods/mod.js'

import { WechatyBuilder } from '../wechaty-builder.js'

import { UrlLinkImpl } from './url-link.js'

import {
  PuppetPost,
  PostTapType,
}                 from './post-puppet-api.js'

test('Post smoke testing', async t => {
  void sinon

  const puppet = new PuppetPost()
  const wechaty = WechatyBuilder.build({ puppet })

  const post = wechaty.Post.builder()
    .add('Hello, world!')
    .add(FileBox.fromQRCode('qr'))
    .add(await UrlLinkImpl.create('https://yahoo.com'))
    .build()

  await wechaty.say(post)

  await post.reply('Thanks for sharing!')
  await post.like(true)
  await post.tap(PostTapType.Like, false)

  const pagination = {
    pageSize: 10,
    pageToken: '',
  }

  for await (const sayable of post) {
    t.ok(sayable, 'tbw')
  }

  for await (const comment of post.descendants()) {
    t.ok(comment, 'tbw')
  }

  const [descendantList, _nextPageToken2] = await post.descendantList({}, pagination)
  t.ok(descendantList, 'tbw')

  for await (const liker of post.taps({ tapType: PostTapType.Like })) {
    t.ok(liker, 'tbw')
  }

  const [tapList, _nextPageToken3] = await post.tapList({ tapType: PostTapType.Like }, pagination)
  t.ok(tapList, 'tbw')
})
