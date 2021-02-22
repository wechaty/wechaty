#!/usr/bin/env ts-node

import test  from 'tstest'

import { UrlLink } from './url-link'

test('UrlLink', async t => {
  const URL = 'https://wechaty.js.org/2020/07/02/wechat-bot-in-ten-minutes'
  const EXPECTED_PAYLOAD = {
    description: '十分钟实现一个智能问答微信聊天机器人',
    thumbnailUrl: 'https://wechaty.js.org/assets/contributors/luweicn/avatar.png',
    title: '十分钟实现一个智能问答微信聊天机器人',
    url: 'https://wechaty.js.org/2020/07/02/wechat-bot-in-ten-minutes',
  }

  const urlLink = await UrlLink.create(URL)
  t.equal(urlLink.title(),        EXPECTED_PAYLOAD.title, 'should have title',)
  t.equal(urlLink.description(),  EXPECTED_PAYLOAD.description, 'should have description',)
  t.equal(urlLink.url(),          EXPECTED_PAYLOAD.url, 'should have url',)
  t.equal(urlLink.thumbnailUrl(), EXPECTED_PAYLOAD.thumbnailUrl, 'should have thumbnailUrl',)
})
