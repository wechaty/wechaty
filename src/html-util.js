
const HtmlUtil = {
  stripHtml:      stripHtml
  , unescapeHtml: unescapeHtml
  , digestEmoji:  digestEmoji

  , plainText:  plainText
}

function stripHtml(html) {
  return String(html).replace(/(<([^>]+)>)/ig,'')
}

function unescapeHtml(str) {
  return String(str)
  .replace(/&apos;/g, "'")
  .replace(/&quot;/g, '"')
  .replace(/&gt;/g, '>')
  .replace(/&lt;/g, '<')
  .replace(/&amp;/g, '&')
}

function digestEmoji(html) {
  return html && html
  .replace(/<img class="(\w*?emoji) (\w*?emoji[^"]+?)" text="(.*?)_web" src=[^>]+>/g
    , '$3') // <img class="emoji emoji1f4a4" text="[流汗]_web" src="/zh_CN/htmledition/v2/images/spacer.gif" />
  .replace(/<span class="(\w*?emoji) (\w*?emoji[^"]+?)"><\/span>/g
    , '[$2]') // '<span class="emoji emoji1f334"></span>'
}

function plainText(html) {
  return unescapeHtml(
    stripHtml(
      digestEmoji(
        html
      )
    )
  )
}
module.exports = HtmlUtil