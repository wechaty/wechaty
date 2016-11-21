/**
 * Wechaty - Wechat for Bot. Connecting ChatBots
 *
 * Licenst: ISC
 * https://github.com/wechaty/wechaty
 *
 */
import * as WebDriver from 'selenium-webdriver'
import * as express   from 'express'
import * as http      from 'http'
import * as url       from 'url'

/* tslint:disable:no-var-requires */
/* tslint:disable:variable-name */
const Phantomjs = require('phantomjs-prebuilt')

import { test } from 'ava'

import { UtilLib } from '../src/util-lib'

test.skip('Phantomjs replace javascript source file content test', async t => {
  const phantomjsArgs = [
    '--load-images=false'
    , '--ignore-ssl-errors=true'  // this help socket.io connect with localhost
    , '--web-security=false'      // https://github.com/ariya/phantomjs/issues/12440#issuecomment-52155299
    , '--ssl-protocol=TLSv1'      // https://github.com/ariya/phantomjs/issues/11239#issuecomment-42362211
    , '--webdriver-loglevel=WARN'
    // , '--webdriver-loglevel=DEBUG'
    // , '--webdriver-logfile=webdriver.debug.log'
    // , '--remote-debugger-port=8080'
  ]

  const customPhantom = WebDriver.Capabilities.phantomjs()
                                // .setAlertBehavior('ignore')
                                .set('phantomjs.binary.path', Phantomjs.path)
                                .set('phantomjs.cli.args', phantomjsArgs)

  const driver = new WebDriver.Builder()
                              .withCapabilities(customPhantom)
                              .build()

  // http://stackoverflow.com/questions/24834403/phantomjs-change-webpage-content-before-evaluating
  ; (driver as any).executePhantomJS(`
this.onResourceRequested = function(request, net) {
  console.log('REQUEST ' + request.url);
  alert('REQUEST ' + request.url);
  // blockRe = /wx\.qq\.com\/\?t=v2\/fake/i
  // https://res.wx.qq.com/zh_CN/htmledition/v2/js/webwxApp2fd632.js
  var webwxAppRe = /res\.wx\.qq\.com\/zh_CN\/htmledition\/v2\/js\/webwxApp.+\.js$/i
  alert('################### matching ' + request.url)
  if (webwxAppRe.test(request.url)) {
    console.log('Abort ' + request.url);
    net.abort();
    alert('################### found ' + request.url)
    var url = request.url + '?' + Date.now()
    load(url, function(source) {
      eval( fix(source) )
    })
  }

  function load(url, cb) {
    var xhr = new XMLHttpRequest()
    xhr.open('GET', url, true)
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        if (xhr.status >= 200 && xhr.status < 300 || xhr.status == 304) {
          cb(xhr.responseText)
        }
      }
      xhr.send(null)
    }
  }

  function fix(source) {
    // "54c6b762ad3618c9ebfd4b439c8d4bda" !== h && ($.getScript("https://tajs.qq.com/stats?sId=54802481"),
    //        location.href = "https://wx.qq.com/?t=v2/fake")
    var fixRe = /"54c6b762ad3618c9ebfd4b439c8d4bda".+?&& \(.+?fake"\)/i
    return source.replace(fixRe, '')
  }
}
`)
  await driver.get('https://wx.qq.com')
  // console.log(await driver.getTitle())

  // t.end()
})

test('Phantomjs http header', async t => {
  // co(function* () {
    const port = await UtilLib.getPort(8080)
// console.log(express)
    const app = express()
    app.use((req, res, done) => {
      // console.log(req.headers)
      t.is(req.headers['referer'], 'https://wx.qq.com/')
      done()
    })

    const server = app.listen(port, _ => {
      t.pass('server listen on ' + port)
    })

    const serverUrl = 'http://127.0.0.1:' + port
    const options: url.Url = url.parse(serverUrl)

    options['headers'] = {
      Accept: 'image/webp,image/*,*/*;q=0.8'
      , 'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36'
      , Referer: 'https://wx.qq.com/'
      , 'Accept-Encoding': 'gzip, deflate, sdch'
      , 'Accept-Language': 'zh-CN,zh;q=0.8'
    }
    options['agent'] = http.globalAgent

    const req = http.request(options as any as http.RequestOptions, (res) => {
      // console.log(`STATUS: ${res.statusCode}`);
      // console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
      // res.setEncoding('utf8');
      t.pass('http.request done')
      server.close()
    })

    req.on('error', e => {
      t.fail('req error')
    })
    req.end()

  // }).catch(e => {
  //   t.fail(e)
  // }).then(_ => {
    // t.end()
  // })
})
