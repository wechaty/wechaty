const co = require('co')
const test = require('tap').test

const log = require('../src/npmlog-env')

const Browser = require('../src/puppet-web-browser')
const PORT = process.env.WECHATY_PORT || 58788
const HEAD = process.env.WECHATY_HEAD || false
const PROFILE = 'unit-test-session.wechaty.json'

test('Browser class cookie smoking tests', function(t) {
  const b = new Browser({port: PORT, head: HEAD})
  t.ok(b, 'should instanciate a browser instance')

  co(function* () {
    yield b.init()
    t.pass('should inited')

    yield b.open()
    t.pass('should opened')

    const two = yield b.execute('return 1+1')
    t.equal(two, 2, 'should got 2 after execute script 1+1')

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

    const dead = b.dead()
    t.equal(dead, false, 'should be a not dead browser')

    const live = yield b.readyLive()
    t.equal(live, true, 'should be a live browser')
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

test('Browser session save & load', function(t) {
  let b = new Browser({
    port: PORT
    , head: HEAD
    , sessionFile: PROFILE
  })
  t.ok(b, 'new Browser')

  co(function* () {
    yield b.init()
    t.pass('inited')

    yield b.open()
    t.pass('opened')

    const EXPECTED_COOKIE = {
      name: 'wechaty_save_to_session'
      , value: '### This cookie should be saved to session file, and load back at next PuppetWeb init  ###'
      , path: '/'
      , domain: '.qq.com'
      , secure: false
      , expiry: 99999999999999
    }
    const EXPECTED_NAME_REGEX = new RegExp('^' + EXPECTED_COOKIE.name + '$')

    yield b.driver.manage().deleteAllCookies()
    let cookies = yield b.driver.manage().getCookies()
    t.equal(cookies.length, 0, 'should no cookie after deleteAllCookies()')

    yield b.addCookies(EXPECTED_COOKIE)
    const cookieFromBrowser = yield b.driver.manage().getCookie(EXPECTED_COOKIE.name)
    t.equal(cookieFromBrowser.name, EXPECTED_COOKIE.name, 'cookie from getCookie() should be same as we just set')

    let cookiesFromCheck = yield b.checkSession()
    t.ok(cookiesFromCheck.length, 'should get cookies from checkSession() after addCookies()')
    let cookieFromCheck  = cookiesFromCheck.filter(c => EXPECTED_NAME_REGEX.test(c.name))
    t.equal(cookieFromCheck[0].name, EXPECTED_COOKIE.name, 'cookie from checkSession() return should be same as we just set by addCookies()')

    const cookiesFromSave = yield b.saveSession()
    t.ok(cookiesFromSave.length, 'should get cookies from saveSession()')
    const cookieFromSave  = cookiesFromSave.filter(c => EXPECTED_NAME_REGEX.test(c.name))
    t.equal(cookieFromSave.length, 1, 'should has the cookie we just set')
    t.equal(cookieFromSave[0].name, EXPECTED_COOKIE.name, 'cookie from saveSession() return should be same as we just set')

    yield b.driver.manage().deleteAllCookies()
    cookiesFromCheck = yield b.checkSession()
    t.equal(cookiesFromCheck.length, 0, 'should no cookie from checkSession() after deleteAllCookies()')

    const cookiesFromLoad = yield b.loadSession().catch(() => {}) // fall safe
    t.ok(cookiesFromLoad.length, 'should get cookies after loadSession()')
    const cookieFromLoad = cookiesFromLoad.filter(c => EXPECTED_NAME_REGEX.test(c.name))
    t.equal(cookieFromLoad[0].name, EXPECTED_COOKIE.name, 'cookie from loadSession() should has expected cookie')

    cookiesFromCheck = yield b.checkSession()
    t.ok(cookiesFromCheck.length, 'should get cookies from checkSession() after loadSession()')
    cookieFromCheck  = cookiesFromCheck.filter(c => EXPECTED_NAME_REGEX.test(c.name))
    t.ok(cookieFromCheck.length, 'should has cookie after filtered after loadSession()')
    t.equal(cookieFromCheck[0].name, EXPECTED_COOKIE.name, 'cookie from checkSession() return should has expected cookie after loadSession')

    yield b.quit()
    t.pass('quited')

    b = new Browser({
      port: PORT
      , head: HEAD
      , sessionFile: PROFILE
    })
    yield b.init()
    yield b.open()
    t.pass('re-new/init/open Browser')

    yield b.loadSession()
    t.pass('loadSession for new instance of Browser')

    const cookieAfterQuit = yield b.driver.manage().getCookie(EXPECTED_COOKIE.name)
    t.equal(cookieAfterQuit.name, EXPECTED_COOKIE.name, 'cookie from getCookie() after browser quit, should load the right cookie back')

    // clean
    require('fs').unlink(PROFILE, err => {
      if (err) {
        log.warn('Browser', 'unlink session file %s fail: %s', PROFILE, err)
      }
    })
  })
  .catch(e => {               // Reject
    log.warn('TestBrowser', 'error: %s', e)
    t.fail(e)
  })
  .then(r => {                // Finally
    b.quit().then(t.end)
  })
  .catch(e => { t.fail(e) })  // Exception
})
