export function stripHtml (html?: string): string {
  if (!html) {
    return ''
  }
  return html.replace(/(<([^>]+)>)/ig, '')
}

export function unescapeHtml (str?: string): string {
  if (!str) {
    return ''
  }
  return str
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
}

export function digestEmoji (html?: string): string {
  if (!html) {
    return ''
  }
  return html
    .replace(/<img class="(\w*?emoji) (\w*?emoji[^"]+?)" text="(.*?)_web" src=[^>]+>/g,
      '$3',
    ) // <img class="emoji emoji1f4a4" text="[流汗]_web" src="/zh_CN/htmledition/v2/images/spacer.gif" />
    .replace(/<span class="(\w*?emoji) (\w*?emoji[^"]+?)"><\/span>/g,
      '[$2]',
    ) // '<span class="emoji emoji1f334"></span>'
}

/**
 * unifyEmoji: the same emoji will be encoded as different xml code in browser. unify them.
 *
 *  from: <img class="emoji emoji1f602" text="_web" src="/zh_CN/htmledition/v2/images/spacer.gif" />
 *  to:   <span class=\"emoji emoji1f602\"></span>
 *
 */
export function unifyEmoji (html?: string): string {
  if (!html) {
    return ''
  }
  return html
    .replace(/<img class="(\w*?emoji) (\w*?emoji[^"]+?)" text="(.*?)_web" src=[^>]+>/g,
      '<emoji code="$2"/>',
    ) // <img class="emoji emoji1f4a4" text="[流汗]_web" src="/zh_CN/htmledition/v2/images/spacer.gif" />
    .replace(/<span class="(\w*?emoji) (\w*?emoji[^"]+?)"><\/span>/g,
      '<emoji code="$2"/>',
    ) // '<span class="emoji emoji1f334"></span>'
}

export function stripEmoji (html?: string): string {
  if (!html) {
    return ''
  }
  return html
    .replace(/<img class="(\w*?emoji) (\w*?emoji[^"]+?)" text="(.*?)_web" src=[^>]+>/g,
      '',
    ) // <img class="emoji emoji1f4a4" text="[流汗]_web" src="/zh_CN/htmledition/v2/images/spacer.gif" />
    .replace(/<span class="(\w*?emoji) (\w*?emoji[^"]+?)"><\/span>/g,
      '',
    ) // '<span class="emoji emoji1f334"></span>'
}

export function plainText (html?: string): string {
  if (!html) {
    return ''
  }
  return stripHtml(
    unescapeHtml(
      stripHtml(
        digestEmoji(
          html,
        ),
      ),
    ),
  )
}
