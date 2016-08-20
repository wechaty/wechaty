'use strict'

const co      = require('co')
const test    = require('tape')
const Express = require('express')
const http    = require('http')

const log   = require('../src/npmlog-env')
const UtilLib  = require('../src/util-lib')

test('Html smoking test', t => {
  const HTML_BEFORE_STRIP = 'Outer<html>Inner</html>'
  const HTML_AFTER_STRIP  = 'OuterInner'

  const HTML_BEFORE_UNESCAPE  = '&apos;|&quot;|&gt;|&lt;|&amp;'
  const HTML_AFTER_UNESCAPE   = `'|"|>|<|&`

  const EMOJI_BEFORE_DIGEST = [
    '<img class="emoji emoji1f4a4" text="[流汗]_web" src="/zh_CN/htmledition/v2/images/spacer.gif" />'
    , '<span class="emoji emoji1f334"></span>'
  ]
  const EMOJI_AFTER_DIGEST  = [
    '[流汗]'
    , '[emoji1f334]'
  ]

  const PLAIN_BEFORE  = '&amp;<html>&amp;</html>&amp;<img class="emoji emoji1f4a4" text="[流汗]_web" src="/zh_CN/htmledition/v2/images/spacer.gif" />'
  const PLAIN_AFTER   = '&&&[流汗]'

  const strippedHtml = UtilLib.stripHtml(HTML_BEFORE_STRIP)
  t.equal(strippedHtml, HTML_AFTER_STRIP, 'should strip html as expected')

  const unescapedHtml = UtilLib.unescapeHtml(HTML_BEFORE_UNESCAPE)
  t.equal(unescapedHtml, HTML_AFTER_UNESCAPE, 'should unescape html as expected')

  for (let i=0; i<EMOJI_BEFORE_DIGEST.length; i++) {
    const emojiDigest = UtilLib.digestEmoji(EMOJI_BEFORE_DIGEST[i])
    t.equal(emojiDigest, EMOJI_AFTER_DIGEST[i], 'should digest emoji string ' + i + ' as expected')
  }
  const plainText = UtilLib.plainText(PLAIN_BEFORE)
  t.equal(plainText, PLAIN_AFTER, 'should convert plain text as expected')

  t.end()
})

test('Media download smoking test', t => {
  const app = new require('express')()
  app.use(require('cookie-parser')())
  app.get('/ding', function(req, res) {
    // console.log(req.cookies)
    t.ok(req.cookies, 'should has cookies in req')
    t.equal(req.cookies.life, '42', 'should has a cookie named life value 42')
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
            t.equal(chunk.toString(), 'dong', 'should success download dong from downloadStream()')
            server.close()
            t.end()
          })
        })
        .catch(e => {
          t.fail('downloadStream() exception: %s', e.message)
        })
})

test('Util getPort', t => {
  const PORT = 8788

  co(function* () {
    let port = yield UtilLib.getPort(PORT)
    t.equal(port, PORT, 'should equal exactly PORT when it is available')

    const app = new Express()
    const server = app.listen(PORT)
    port = yield UtilLib.getPort(PORT)
    server.close()

    t.equal(port, PORT+1, 'should bigger then PORT when it is not availble')

  }).catch(e => {
    t.fail(e)
  }).then(_ => {
    t.end()
  })
})
