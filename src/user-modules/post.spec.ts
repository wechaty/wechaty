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
  PostBuilder,
}                   from './post.js'
import { PuppetPost } from './post-puppet-api.js'

test('Post smoke testing', async t => {
  void sinon

  const puppet = new PuppetPost()
  const wechaty = WechatyBuilder.build({ puppet })

  const post = await PostBuilder.new()
    .add('Hello, world!')
    .add(FileBox.fromQRCode('qr'))
    .add(await UrlLinkImpl.create('https://yahoo.com'))
    .build()

  await wechaty.say(post)

  post.comment('Thanks for sharing!')
  post.like(true)
  post.tap(WECHATY.type.Post.Tap.Like, false)

  const pagination = {
    pageSize: 10,
    pageToken: '',
  }
  for await (const comment of post.comments(pagination)) {
    t.ok(comment, 'tbw')
  }

  for await (const like of post.taps(WECHATY.type.Post.Tap.Like, pagination)) {
    t.ok(like, 'tbw')
  }

})
