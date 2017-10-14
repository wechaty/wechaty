/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2017 Huan LI <zixia@zixia.net>
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
import * as crypto  from 'crypto'
import * as https   from 'https'
import * as http    from 'http'
import {
  Readable,
}                   from 'stream'
import * as url     from 'url'

import { log }      from './config'
import { MsgType }  from './message'

export class Misc {
  public static stripHtml(html?: string): string {
    if (!html) {
      return ''
    }
    return html.replace(/(<([^>]+)>)/ig, '')
  }

  public static unescapeHtml(str?: string): string {
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

  public static digestEmoji(html?: string): string {
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
  public static unifyEmoji(html?: string): string {
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

  public static stripEmoji(html?: string): string {
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

  public static plainText(html?: string): string {
    if (!html) {
      return ''
    }
    return Misc.stripHtml(
      Misc.unescapeHtml(
        Misc.stripHtml(
          Misc.digestEmoji(
            html,
          ),
        ),
      ),
    )
  }

  public static urlStream(href: string, cookies: any[]): Promise<Readable> {
    // const myurl = 'http://wx.qq.com/cgi-bin/mmwebwx-bin/webwxgetmsgimg?&MsgID=3080011908135131569&skey=%40crypt_c117402d_53a58f8fbb21978167a3fc7d3be7f8c9'
    href = href.replace(/^https/i, 'http') // use http instead of https, because https will only success on the very first request!

    const u = url.parse(href)
    const protocol = u.protocol as 'https:'|'http:'

    let options
    // let request
    let get

    if (protocol === 'https:') {
      // request       = https.request.bind(https)
      get           = https.get
      options       = u as any as https.RequestOptions
      options.agent = https.globalAgent
    } else if (protocol === 'http:') {
      // request       = http.request.bind(http)
      get           = http.get
      options       = u as any as http.RequestOptions
      options.agent = http.globalAgent
    } else {
      throw new Error('protocol unknown: ' + protocol)
    }

    options.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36',

      // Accept: 'image/webp,image/*,*/*;q=0.8',
      // Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8', //  MsgType.IMAGE | VIDEO
      Accept: '*/*',

      Host: options.hostname, // 'wx.qq.com',  // MsgType.VIDEO | IMAGE

      Referer: protocol + '//wx.qq.com/',

      // 'Upgrade-Insecure-Requests': 1, // MsgType.VIDEO | IMAGE

      Range: 'bytes=0-',

      // 'Accept-Encoding': 'gzip, deflate, sdch',
      // 'Accept-Encoding': 'gzip, deflate, sdch, br', // MsgType.IMAGE | VIDEO
      'Accept-Encoding': 'identity;q=1, *;q=0',

      'Accept-Language': 'zh-CN,zh;q=0.8', // MsgType.IMAGE | VIDEO
      // 'Accept-Language': 'zh-CN,zh;q=0.8,zh-TW;q=0.6,en-US;q=0.4,en;q=0.2',
    }

    /**
     * pgv_pvi=6639183872; pgv_si=s8359147520; webwx_data_ticket=gSeBbuhX+0kFdkXbgeQwr6Ck
     */
    options.headers['Cookie'] = cookies.map(c => `${c['name']}=${c['value']}`).join('; ')
    // log.verbose('Util', 'Cookie: %s', options.headers.Cookie)
// console.log(options)

    return new Promise<Readable>((resolve, reject) => {
      // const req = request(options, (res) => {
      const req = get(options, (res) => {
        // console.log(`STATUS: ${res.statusCode}`);
        // console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
        // res.setEncoding('utf8');
        resolve(res)
      })

      req.on('error', (e) => {
        log.warn('UtilLib', `urlStream() problem with request: ${e.message}`)
        reject(e)
      })

      // req.end(() => {
      //   log.verbose('UtilLib', 'urlStream() req.end() request sent')
      // })

    })
  }

  // credit - http://stackoverflow.com/a/2117523/1123955
  public static guid(): string {
    /* tslint:disable:no-bitwise */
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  /**
   *
   * @param port is just a suggestion.
   * there's no grantuee for the number
   *
   * The IANA suggested ephemeral port range.
   * @see http://en.wikipedia.org/wiki/Ephemeral_ports
   *
   * const DEFAULT_IANA_RANGE = {min: 49152, max: 65535}
   *
   */
  public static getPort(port: number): Promise<number> {
    log.silly('UtilLib', 'getPort(%d)', port)
    let tryPort = nextPort(port || 38788)

    return new Promise((resolve, reject) => {
      // https://gist.github.com/mikeal/1840641
      function _getPort(cb) {
        const server = require('net').createServer()
        server.on('error', function(err) {
          if (err) {/* fail safe */ }
          tryPort = nextPort(port)
          _getPort(cb)
        })
        server.listen(tryPort, function(err) {
          if (err) {/* fail safe */}
          server.once('close', function() {
            cb(tryPort)
          })
          server.close()
        })
      }
      _getPort(okPort => {
        log.silly('UtilLib', 'getPort(%d) return: %d',
                  port,
                  okPort,
        )
        resolve(okPort)
      })
    })

    function nextPort(currentPort: number): number {
      const RANGE = 1733
      // do not use Math.random() here, because AVA will fork, then here will get the same random number, cause a race condition for socket listen
      // const n = Math.floor(Math.random() * BETWEEN_RANGE)

      /**
       * nano seconds from node: http://stackoverflow.com/a/18197438/1123955
       */
      const [, nanoSeed] = process.hrtime()
      const n = 1 + nanoSeed % RANGE // +1 to prevent same port

      if (currentPort + n > 65000) {
        return currentPort + n - RANGE
      }
      return currentPort + n
    }
  }

  public static md5(buffer: Buffer): string {
    const md5sum = crypto.createHash('md5')
    md5sum.update(buffer)
    return md5sum.digest('hex')
  }

  public static msgType(ext: string): MsgType {
    switch (ext) {
      case 'bmp':
      case 'jpeg':
      case 'jpg':
      case 'png':
        return MsgType.IMAGE
      case 'gif':
        return MsgType.EMOTICON
      case 'mp4':
        return MsgType.VIDEO
      default:
        return MsgType.APP
    }
  }

  // public static mime(ext): string {
  //   switch (ext) {
  //     case 'pdf':
  //       return 'application/pdf'
  //     case 'bmp':
  //       return 'image/bmp'
  //     case 'jpeg':
  //       return 'image/jpeg'
  //     case 'jpg':
  //       return 'image/jpeg'
  //     case 'png':
  //       return 'image/png'
  //     case 'gif':
  //       return 'image/gif'
  //     case 'mp4':
  //       return 'video/mp4'
  //     default:
  //       return 'application/octet-stream'
  //   }
  // }
}

export default Misc
