
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
  // <img class="emoji emoji1f4a4" text="[流汗]_web" src="/zh_CN/htmledition/v2/images/spacer.gif" />
  return html && html
  .replace(/<img class="(\w*?emoji) (\w*?emoji[^"]+?)" text="(.*?)_web" src=[^>]+>/g
    , '$3')
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