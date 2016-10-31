import { test } from 'ava'
import {
  UtilLib
}  from '../'

import * as express  from 'express'
// import * as http     from 'http'

test('stripHtml()', t => {
  const HTML_BEFORE_STRIP = 'Outer<html>Inner</html>'
  const HTML_AFTER_STRIP  = 'OuterInner'

  const strippedHtml = UtilLib.stripHtml(HTML_BEFORE_STRIP)
  t.is(strippedHtml, HTML_AFTER_STRIP, 'should strip html as expected')
})

test('unescapeHtml()', t => {
  const HTML_BEFORE_UNESCAPE  = '&apos;|&quot;|&gt;|&lt;|&amp;'
  const HTML_AFTER_UNESCAPE   = `'|"|>|<|&`

  const unescapedHtml = UtilLib.unescapeHtml(HTML_BEFORE_UNESCAPE)
  t.is(unescapedHtml, HTML_AFTER_UNESCAPE, 'should unescape html as expected')
})

test('plainText()', t => {
  const PLAIN_BEFORE  = '&amp;<html>&amp;</html>&amp;<img class="emoji emoji1f4a4" text="[流汗]_web" src="/zh_CN/htmledition/v2/images/spacer.gif" />'
  const PLAIN_AFTER   = '&&&[流汗]'

  const plainText = UtilLib.plainText(PLAIN_BEFORE)
  t.is(plainText, PLAIN_AFTER, 'should convert plain text as expected')

})

test('digestEmoji()', t => {
  const EMOJI_XML = [
    '<img class="emoji emoji1f4a4" text="[流汗]_web" src="/zh_CN/htmledition/v2/images/spacer.gif" />'
    , '<span class="emoji emoji1f334"></span>'
  ]
  const EMOJI_AFTER_DIGEST  = [
    '[流汗]'
    , '[emoji1f334]'
  ]

  for (let i = 0; i < EMOJI_XML.length; i++) {
    const emojiDigest = UtilLib.digestEmoji(EMOJI_XML[i])
    t.is(emojiDigest, EMOJI_AFTER_DIGEST[i], 'should digest emoji string ' + i + ' as expected')
  }
})

test('unifyEmoji()', t => {
  const ORIGNAL_XML_LIST: [string[], string][] = [
    [
      [
        '<img class="emoji emoji1f602" text="_web" src="/zh_CN/htmledition/v2/images/spacer.gif" />'
      , '<span class=\"emoji emoji1f602\"></span>'
      ]
      , '<emoji code="emoji1f602"/>'
    ]
  ]

  ORIGNAL_XML_LIST.forEach(([xmlList, expectedEmojiXml]) => {
    xmlList.forEach(xml => {
      const unifiedXml = UtilLib.unifyEmoji(xml)
      t.is(unifiedXml, expectedEmojiXml, 'should convert the emoji xml to the expected unified xml')
    })
  })
})

test('stripEmoji()', t => {
  const EMOJI_STR = [
    [
        'ABC<img class="emoji emoji1f4a4" text="[流汗]_web" src="/zh_CN/htmledition/v2/images/spacer.gif" />DEF'
      , 'ABCDEF'
    ]
    , [
        'UVW<span class="emoji emoji1f334"></span>XYZ'
      , 'UVWXYZ'
    ]
  ]

  EMOJI_STR.forEach(([emojiStr, expectResult]) => {
    const result = UtilLib.stripEmoji(emojiStr)
    t.is(result, expectResult, 'should strip to the expected str')
  })

  const empty = UtilLib.stripEmoji(undefined)
  t.is(empty, '', 'should return empty string for `undefined`')
})

test('downloadStream() for media', t => {
  const app = express()
  app.use(require('cookie-parser')())
  app.get('/ding', function(req, res) {
    // console.log(req.cookies)
    t.truthy(req.cookies, 'should has cookies in req')
    t.is(req.cookies.life, '42', 'should has a cookie named life value 42')
    res.end('dong')
  })

  const server = require('http').createServer(app)
  server.on('clientError', (err, socket) => {
    t.fail('server on clientError')
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n')
  })
  server.listen(8000)

  UtilLib.downloadStream('http://127.0.0.1:8000/ding', [{name: 'life', value: 42}])
        .then(s => {
          s.on('data', (chunk) => {
            // console.log(`BODY: ${chunk}`)
            t.is(chunk.toString(), 'dong', 'should success download dong from downloadStream()')
            server.close()
          })
        })
        .catch(e => {
          t.fail('downloadStream() exception: ' + e.message)
        })
})

test('getPort() for an available socket port', async t => {
  const PORT = 8788

  let port = await UtilLib.getPort(PORT)
  t.not(port, PORT, 'should not be same port even it is available(to provent conflict between concurrency tests in AVA)')

  let ttl = 17
  while (ttl-- > 0) {
    try {
      const app = express()
      const server = app.listen(PORT)
      port = await UtilLib.getPort(PORT)
      server.close()
    } catch (e) {
      t.fail('should not exception: ' + e.message + ', ' + e.stack)
    }
  }
  t.pass('should has no exception after loop test')
})
