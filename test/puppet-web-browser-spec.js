const co = require('co')
const test = require('tap').test
const log = require('npmlog')
// log.level = 'silly'

const Browser = require('../src/puppet-web-browser')
const PORT = 58788

test('Browser class smoking tests', function(t) {
  const b = new Browser({port: PORT})
  t.ok(b, 'Browser instance created')

  co(function* () {
    yield b.init()
    t.pass('inited')

    yield b.open()
    t.pass('opened')

    const two = yield b.execute('return 1+1')
    t.equal(two, 2, 'execute script ok')

    let cookies = yield b.getCookies()
    t.ok(cookies.length, 'should got plenty of cookies')

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

    yield b.setCookie(EXPECTED_COOKIES)

    cookies = yield b.getCookies()
    const cookies0 = cookies.filter(c => { return RegExp(EXPECTED_COOKIES[0].name).test(c.name) })
    t.equal(cookies0[0].name, EXPECTED_COOKIES[0].name, 'should filter out the cookie named wechaty0')
    const cookies1 = cookies.filter(c => { return RegExp(EXPECTED_COOKIES[1].name).test(c.name) })
    t.equal(cookies1[0].name, EXPECTED_COOKIES[1].name, 'should filter out the cookie named wechaty1')
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
