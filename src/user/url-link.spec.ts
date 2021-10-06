#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
import { test } from 'tstest'
import type { Wechaty } from '../wechaty.js'

import {
  wechatifyUrlLink,
}                       from './url-link.js'

const wechaty = {
  puppet: {} as any,
} as any as Wechaty

const TestUrlLink = wechatifyUrlLink(wechaty)

test('UrlLink', async t => {
  const URL = 'https://wechaty.js.org/2020/07/02/wechat-bot-in-ten-minutes'
  const EXPECTED_PAYLOAD = {
    description: 'Conversational RPA SDK for Chatbot Makers',
    thumbnailUrl: 'https://wechaty.js.org/assets/contributors/luweicn/avatar.webp',
    title: '十分钟实现一个智能问答微信聊天机器人',
    url: 'https://wechaty.js.org/2020/07/02/wechat-bot-in-ten-minutes',
  }

  const urlLink = await TestUrlLink.create(URL)
  t.equal(urlLink.title(),        EXPECTED_PAYLOAD.title, 'should have title',)
  t.equal(urlLink.description(),  EXPECTED_PAYLOAD.description, 'should have description',)
  t.equal(urlLink.url(),          EXPECTED_PAYLOAD.url, 'should have url',)
  t.equal(urlLink.thumbnailUrl(), EXPECTED_PAYLOAD.thumbnailUrl, 'should have thumbnailUrl',)
})
