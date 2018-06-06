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
import sinon from 'sinon'
// const sinonTest   = require('sinon-test')(sinon)

import http      from 'http'
import express   from 'express'

import promiseRetry = require('promise-retry')

import Misc     from './misc'
import {
  log,
}               from './config'

test('stripHtml()', async t => {
  const HTML_BEFORE_STRIP = 'Outer<html>Inner</html>'
  const HTML_AFTER_STRIP  = 'OuterInner'

  const strippedHtml = Misc.stripHtml(HTML_BEFORE_STRIP)
  t.is(strippedHtml, HTML_AFTER_STRIP, 'should strip html as expected')
})

test('unescapeHtml()', async t => {
  const HTML_BEFORE_UNESCAPE  = '&apos;|&quot;|&gt;|&lt;|&amp;'
  const HTML_AFTER_UNESCAPE   = `'|"|>|<|&`

  const unescapedHtml = Misc.unescapeHtml(HTML_BEFORE_UNESCAPE)
  t.is(unescapedHtml, HTML_AFTER_UNESCAPE, 'should unescape html as expected')
})

test('plainText()', async t => {
  const PLAIN_BEFORE  = '&amp;<html>&amp;</html>&amp;<img class="emoji emoji1f4a4" text="[流汗]_web" src="/zh_CN/htmledition/v2/images/spacer.gif" />'
  const PLAIN_AFTER   = '&&&[流汗]'

  const plainText = Misc.plainText(PLAIN_BEFORE)
  t.is(plainText, PLAIN_AFTER, 'should convert plain text as expected')

})

test('digestEmoji()', async t => {
  const EMOJI_XML = [
    '<img class="emoji emoji1f4a4" text="[流汗]_web" src="/zh_CN/htmledition/v2/images/spacer.gif" />',
    '<img class="qqemoji qqemoji13" text="[呲牙]_web" src="/zh_CN/htmledition/v2/images/spacer.gif" />',
    '<img class="emoji emoji1f44d" text="_web" src="/zh_CN/htmledition/v2/images/spacer.gif" />',
    '<span class="emoji emoji1f334"></span>',
  ]
  const EMOJI_AFTER_DIGEST  = [
    '[流汗]',
    '[呲牙]',
    '',
    '[emoji1f334]',
  ]

  for (let i = 0; i < EMOJI_XML.length; i++) {
    const emojiDigest = Misc.digestEmoji(EMOJI_XML[i])
    t.is(emojiDigest, EMOJI_AFTER_DIGEST[i], 'should digest emoji string ' + i + ' as expected')
  }
})

test('unifyEmoji()', async t => {
  const ORIGNAL_XML_LIST: [string[], string][] = [
    [
      [
        '<img class="emoji emoji1f602" text="_web" src="/zh_CN/htmledition/v2/images/spacer.gif" />',
        '<span class=\"emoji emoji1f602\"></span>',
      ],
        '<emoji code="emoji1f602"/>',
    ],
  ]

  ORIGNAL_XML_LIST.forEach(([xmlList, expectedEmojiXml]) => {
    xmlList.forEach(xml => {
      const unifiedXml = Misc.unifyEmoji(xml)
      t.is(unifiedXml, expectedEmojiXml, 'should convert the emoji xml to the expected unified xml')
    })
  })
})

test('stripEmoji()', async t => {
  const EMOJI_STR = [
    [
      'ABC<img class="emoji emoji1f4a4" text="[流汗]_web" src="/zh_CN/htmledition/v2/images/spacer.gif" />DEF',
      'ABCDEF',
    ],
    [
      'UVW<span class="emoji emoji1f334"></span>XYZ',
      'UVWXYZ',
    ],
  ]

  EMOJI_STR.forEach(([emojiStr, expectResult]) => {
    const result = Misc.stripEmoji(emojiStr)
    t.is(result, expectResult, 'should strip to the expected str')
  })

  const empty = Misc.stripEmoji(undefined)
  t.is(empty, '', 'should return empty string for `undefined`')
})

test('downloadStream() for media', async t => {
  const app = express()
  app.use(require('cookie-parser')())
  app.get('/ding', function(req, res) {
    // console.log(req.cookies)
    t.ok(req.cookies, 'should has cookies in req')
    t.is(req.cookies.life, '42', 'should has a cookie named life value 42')
    res.end('dong')
  })

  const server = http.createServer(app)
  server.on('clientError', (err, socket) => {
    t.fail('server on clientError' + err)
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n')
  })
  server.listen(65534)

  try {
    const s = await Misc.urlStream('http://127.0.0.1:65534/ding', [{name: 'life', value: 42}])
    await new Promise((resolve, reject) => {
      s.on('data', (chunk) => {
        // console.log(`BODY: ${chunk}`)
        t.is(chunk.toString(), 'dong', 'should success download dong from downloadStream()')
        server.close()
        resolve()
      })
      s.on('error', reject)
    })
  } catch (e) {
    t.fail('downloadStream() exception: ' + e.message)
  }
})

test('getPort() for an available socket port', async t => {
  const PORT = 8788

  let port = await Misc.getPort(PORT)
  t.not(port, PORT, 'should not be same port even it is available(to provent conflict between concurrency tests in AVA)')

  let ttl = 17
  while (ttl-- > 0) {
    try {
      const app = express()
      const server = app.listen(PORT)
      port = await Misc.getPort(PORT)
      server.close()
    } catch (e) {
      t.fail('should not exception: ' + e.message + ', ' + e.stack)
    }
  }
  t.pass('should has no exception after loop test')
})

test('promiseRetry()', async t => {
  const EXPECTED_RESOLVE = 'Okey'
  const EXPECTED_REJECT  = 'NotTheTime'

  function delayedFactory(timeout: number) {
    const startTime = Date.now()
    return function() {
      const nowTime = Date.now()
      log.silly('MiscTest', 'promiseRetry() delayedFactory(' + timeout + '): ' + (nowTime - startTime))
      if (nowTime - startTime > timeout) {
        return Promise.resolve(EXPECTED_RESOLVE)
      }
      return Promise.reject(EXPECTED_REJECT)
    }
  }

  const thenSpy = sinon.spy()

  const delay500 = delayedFactory(500)
  await promiseRetry(
    {
      minTimeout : 1,
      retries    : 1,
    },
    function(retry) {
      return delay500().catch(retry)
    },
  ).catch((e: any) => {
    thenSpy(e)
  })
  t.true(thenSpy.withArgs(EXPECTED_REJECT).calledOnce, 'should got EXPECTED_REJECT when wait not enough')

  thenSpy.resetHistory()
  const anotherDelay50 = delayedFactory(50)
  await promiseRetry(
    {
      minTimeout: 1,
      retries: 100,
    },
    function(retry, attempt) {
      log.silly('MiscTest', 'promiseRetry() attempt = %d', attempt)
      return anotherDelay50().catch(retry)
    },
  )
  .then((r: string) => {
    thenSpy(r)
  })
  t.true(thenSpy.withArgs(EXPECTED_RESOLVE).calledOnce, 'should got EXPECTED_RESOLVE when wait enough')
})

test('retry()', async t => {
  const EXPECTED_RESOLVE = 'Okey'
  const EXPECTED_REJECT  = 'NotTheTime'

  function delayedFactory(timeout: number) {
    const startTime = Date.now()
    return function() {
      const nowTime = Date.now()
      log.silly('MiscTest', 'promiseRetry() delayedFactory(' + timeout + '): ' + (nowTime - startTime))
      if (nowTime - startTime > timeout) {
        return Promise.resolve(EXPECTED_RESOLVE)
      }
      return Promise.reject(EXPECTED_REJECT)
    }
  }

  const thenSpy = sinon.spy()

  const anotherDelay50 = delayedFactory(50)
  await Misc.retry(
    function(retry, attempt) {
      log.silly('MiscTest', 'promiseRetry() attempt = %d', attempt)
      return anotherDelay50().catch(retry)
    },
  )
  .then((r: string) => {
    thenSpy(r)
  })
  t.true(thenSpy.withArgs(EXPECTED_RESOLVE).calledOnce, 'should got EXPECTED_RESOLVE when wait enough')
})
