'use strict'

const test   = require('tap').test

const log       = require('../src/npmlog-env')
const htmlUtil  = require('../src/html-util')

test('HtmlUtil smoking test', function(t) {
  const HTML_BEFORE_STRIP = 'Outer<html>Inner</html>'
  const HTML_AFTER_STRIP  = 'OuterInner'

  const HTML_BEFORE_UNESCAPE  = '&apos;|&quot;|&gt;|&lt;|&amp;'
  const HTML_AFTER_UNESCAPE   = `'|"|>|<|&`

  const EMOJI_BEFORE_DIGEST = '<img class="emoji emoji1f4a4" text="[流汗]_web" src="/zh_CN/htmledition/v2/images/spacer.gif" />'
  const EMOJI_AFTER_DIGEST  = '[流汗]'

  const PLAIN_BEFORE  = '&amp;<html>&amp;</html>&amp;<img class="emoji emoji1f4a4" text="[流汗]_web" src="/zh_CN/htmledition/v2/images/spacer.gif" />'
  const PLAIN_AFTER   = '&&&[流汗]'

  const strippedHtml = htmlUtil.stripHtml(HTML_BEFORE_STRIP)
  t.equal(strippedHtml, HTML_AFTER_STRIP, 'should strip html as expected')

  const unescapedHtml = htmlUtil.unescapeHtml(HTML_BEFORE_UNESCAPE)
  t.equal(unescapedHtml, HTML_AFTER_UNESCAPE, 'should unescape html as expected')

  const emojiDigest = htmlUtil.digestEmoji(EMOJI_BEFORE_DIGEST)
  t.equal(emojiDigest, EMOJI_AFTER_DIGEST, 'should digest emoji as expected')

  const plainText = htmlUtil.plainText(PLAIN_BEFORE)
  t.equal(plainText, PLAIN_AFTER, 'should convert plain text as expected')

  t.end()
})
