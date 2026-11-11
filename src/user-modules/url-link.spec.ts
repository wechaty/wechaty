#!/usr/bin/env -S node --import=tsx/esm
import { test } from 'node:test'
import assert from 'node:assert/strict'
import openGraph from 'open-graph'
import type { Wechaty } from '../mods/mod.js'
import { MessageImpl } from './message.js'

import { wechatifyUserModule } from './mod.js'
import { UrlLinkImpl } from './url-link.js'

const wechaty = {
  puppet: {} as any,
} as any as Wechaty

const UrlLinkTest = wechatifyUserModule(UrlLinkImpl)(wechaty)

test('UrlLink.create() for wechaty.js.org', async t => {
  const URL = 'https://wechaty.js.org/2020/07/02/wechat-bot-in-ten-minutes'
  const HTML = `
    <html><head>
      <meta property="og:title" content="十分钟实现一个智能问答微信聊天机器人">
      <meta property="og:description" content="Conversational RPA SDK for Chatbot Makers">
      <meta property="og:image" content="/assets/contributors/luweicn/avatar.webp">
    </head></html>
  `
  const EXPECTED_PAYLOAD = {
    description: 'Conversational RPA SDK for Chatbot Makers',
    title: '十分钟实现一个智能问答微信聊天机器人',
  }
  type RequestCallback = Parameters<typeof openGraph.getHTML>[1]

  t.mock.method(openGraph, 'getHTML', (
    _url: Parameters<typeof openGraph.getHTML>[0],
    callbackOrUserAgent: RequestCallback | string,
    callback?: RequestCallback,
  ) => {
    const requestCallback = callback ?? callbackOrUserAgent
    if (typeof requestCallback === 'function') {
      requestCallback(null, HTML)
    }
  })

  const urlLink = await UrlLinkTest.create(URL)
  assert.equal(urlLink.title(),        EXPECTED_PAYLOAD.title, 'should have title')
  assert.equal(urlLink.description(),  EXPECTED_PAYLOAD.description, 'should have description')
  assert.equal(urlLink.url(),          URL, 'should have url')
  assert.equal(urlLink.thumbnailUrl(), 'https://wechaty.js.org/assets/contributors/luweicn/avatar.webp', 'should have thumbnailUrl')
})

test('UrlLink.valid()', async _t => {
  const urlLink = new UrlLinkTest({} as any)
  assert.ok(UrlLinkImpl.valid(urlLink), 'should pass the validation of UrlLinkImpl')
  assert.ok(!MessageImpl.valid(urlLink), 'should not pass the validation of MessageImpl')
})
