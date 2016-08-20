'use strict'

const WebDriver = require('selenium-webdriver')
const Express   = require('express')
const http      = require('http')
const url       = require('url')
const co = require('co')

const test  = require('tape')

const UtilLib  = require('../src/util-lib')
const log   = require('../src/npmlog-env')

false && test('Phantomjs smoking test', t => {
  const phantomjsExe = require('phantomjs-prebuilt').path

  const phantomjsArgs = [
    '--load-images=false'
    , '--ignore-ssl-errors=true'  // this help socket.io connect with localhost
    , '--web-security=false'      // https://github.com/ariya/phantomjs/issues/12440#issuecomment-52155299
    , '--ssl-protocol=TLSv1'      // https://github.com/ariya/phantomjs/issues/11239#issuecomment-42362211
  ]

  phantomjsArgs.push('--remote-debugger-port=8080') // XXX: be careful when in production env.
  phantomjsArgs.push('--webdriver-loglevel=DEBUG')
  // phantomjsArgs.push('--webdriver-logfile=webdriver.debug.log')

  const customPhantom = WebDriver.Capabilities.phantomjs()
  .setAlertBehavior('ignore')
  .set('phantomjs.binary.path', phantomjsExe)
  .set('phantomjs.cli.args', phantomjsArgs)
  .set('phantomjs.page.settings.userAgent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.9; rv:25.0) Gecko/20100101 Firefox/25.0')

  const driver = new WebDriver.Builder()
  .withCapabilities(customPhantom)
  .build()

  driver.get('https://wx.qq.com')

  t.end()
})

test('Phantomjs http header', t => {
  co(function* () {
    const port = yield UtilLib.getPort(8080)

    const app = new Express()
    app.use((req, res, done) => {
      //console.log(req.headers)
      t.equal(req.headers.referer, 'https://wx.qq.com/')
      done()
    })

    const server = app.listen(port, _ => {
      t.pass('server listen on ' + port)
    })

    const endpoint = 'http://127.0.0.1:' + port
    const options = url.parse(endpoint)

    options.headers = {
      Accept: 'image/webp,image/*,*/*;q=0.8'
                , 'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36'
                  , Referer: 'https://wx.qq.com/'
                    , 'Accept-Encoding': 'gzip, deflate, sdch'
                      , 'Accept-Language': 'zh-CN,zh;q=0.8'
    }
    options.agent = http.globalAgent

    const req = http.request(options, (res) => {
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

  }).catch(e => {
    t.fail(e)
  }).then(_ => {
    t.end()
  })
})
