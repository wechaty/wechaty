'use strict'

const test   = require('tap').test

const log       = require('../src/npmlog-env')
const webUtil  = require('../src/web-util')

test('HtmlUtil smoking test', function(t) {
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

  const strippedHtml = webUtil.stripHtml(HTML_BEFORE_STRIP)
  t.equal(strippedHtml, HTML_AFTER_STRIP, 'should strip html as expected')

  const unescapedHtml = webUtil.unescapeHtml(HTML_BEFORE_UNESCAPE)
  t.equal(unescapedHtml, HTML_AFTER_UNESCAPE, 'should unescape html as expected')

  for (let i=0; i<EMOJI_BEFORE_DIGEST.length; i++) {
    const emojiDigest = webUtil.digestEmoji(EMOJI_BEFORE_DIGEST[i])
    t.equal(emojiDigest, EMOJI_AFTER_DIGEST[i], 'should digest emoji string ' + i + ' as expected')
  }
  const plainText = webUtil.plainText(PLAIN_BEFORE)
  t.equal(plainText, PLAIN_AFTER, 'should convert plain text as expected')

  t.end()
})
