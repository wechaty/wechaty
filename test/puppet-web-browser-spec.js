const co = require('co')
const test = require('tap').test
const log = require('../src/npmlog-env')

const Browser = require('../src/puppet-web-browser')
const PORT = process.env.WECHATY_PORT || 58788
const HEAD = process.env.WECHATY_HEAD || false

test('Browser class smoking tests', function(t) {
  const b = new Browser({port: PORT, head: HEAD})
  t.ok(b, 'Browser instance created')

  co(function* () {
    yield b.init()
    t.pass('inited')

    yield b.open()
    t.pass('opened')

    const two = yield b.execute('return 1+1')
    t.equal(two, 2, 'execute script ok')

    let cookies = yield b.driver.manage().getCookies()
    t.ok(cookies.length, 'should got plenty of cookies')

    yield b.driver.manage().deleteAllCookies()
    cookies = yield b.driver.manage().getCookies()
    t.equal(cookies.length, 0, 'should no cookie anymore after deleteAllCookies()')

    const EXPECTED_COOKIES = [{
      name: 'wechaty0'
      , value: '8788-0'
      , path: '/'
      , domain: '.qq.com'
      , secure: false
      , expiry: 99999999999999
    }
    , {
      name: 'wechaty1'
      , value: '8788-1'
      , path: '/'
      , domain: '.qq.com'
      , secure: false
      , expiry: 99999999999999
    }]

    yield b.addCookies(EXPECTED_COOKIES)

    cookies = yield b.driver.manage().getCookies()
    const cookies0 = cookies.filter(c => { return RegExp(EXPECTED_COOKIES[0].name).test(c.name) })
    t.equal(cookies0[0].name, EXPECTED_COOKIES[0].name, 'getCookies() should filter out the cookie named wechaty0')
    const cookies1 = cookies.filter(c => { return RegExp(EXPECTED_COOKIES[1].name).test(c.name) })
    t.equal(cookies1[0].name, EXPECTED_COOKIES[1].name, 'getCookies() should filter out the cookie named wechaty1')

    yield b.open()
    t.pass('re-opened url')
    const cookieAfterOpen = yield b.driver.manage().getCookie(EXPECTED_COOKIES[0].name)
    t.equal(cookieAfterOpen.name, EXPECTED_COOKIES[0].name, 'getCookie() should get expected cookie named after re-open url')
  })
  .catch((e) => { // Rejected
    t.fail('co promise rejected:' + e)
  })
  .then(r => {    // Finally
    b.quit()
    t.end()
  })
  .catch(e => {   // Exception
    t.fail('Exception:' + e)
  })
})
