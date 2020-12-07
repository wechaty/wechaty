#!/usr/bin/env ts-node

import test  from 'tstest'

import { UrlLink } from './url-link'

test('UrlLink', async t => {
  const urlLink = await UrlLink.create('https://wechaty.js.org/2020/07/02/wechat-bot-in-ten-minutes')
  t.true(urlLink.title, 'should have title',)
  t.true(urlLink.description, 'should have description',)
  t.true(urlLink.url, 'should have url',)
  t.true(urlLink.thumbnailUrl, 'should have thumbnailUrl',)
})
