const co    = require('co')
const util  = require('util')
const test  = require('tap').test

const log = require('../src/npmlog-env')

const PORT = process.env.WECHATY_PORT || 58788
const HEAD = process.env.WECHATY_HEAD || false
const SESSION = 'unit-test-session.json'

const PuppetWeb = require('../src/puppet-web')

function dingSocket(server) {
  const maxTime   = 9000
  const waitTime  = 500
  let   totalTime = 0
  return new Promise((resolve, reject) => {
    log.verbose('TestPuppetWeb', 'dingSocket()')
    return testDing()

    function testDing() {
      // log.silly('TestPuppetWeb', server.socketio)
      if (!server.socketClient) {
        totalTime += waitTime
        if (totalTime > maxTime) {
          return reject('timeout after ' + totalTime + 'ms')
        }

        log.silly('TestPuppetWeb', 'waiting socketClient to connect for ' + totalTime + '/' + maxTime + ' ms...')
        setTimeout(testDing, waitTime)
        return
      }
      //log.silly('TestPuppetWebServer', server.socketClient)
      server.socketClient.once('dong', data => {
        log.verbose('TestPuppetWeb', 'socket recv event dong: ' + data)
        return resolve(data)
      })
      server.socketClient.emit('ding')
    }
  })
}

false && test('PuppetWeb smoke testing', function(t) {
  let pw
  co(function* () {
    pw = new PuppetWeb({port: PORT, head: HEAD, session: SESSION})
    t.ok(pw, 'new PuppetWeb')

    yield pw.init()
    t.pass('pw full inited')
    t.equal(pw.isLogined() , false  , 'instance not logined')

    // XXX find a better way to mock...
    pw.bridge.getUserName = function () { return Promise.resolve('mockedUserName') }

    const p1 = new Promise((resolve) => {
      pw.once('login', r => {
        t.equal(pw.isLogined() , true   , 'logined after login event')
        resolve()
      })
    })
    pw.server.emit('login')
    yield p1

    const p2 = new Promise((resolve) => {
      pw.once('logout', r => {
        t.equal(pw.isLogined() , false  , 'logouted after logout event')
        resolve()
      })
    })
    pw.server.emit('logout')
    yield p2

  })
  .catch(e => t.fail(e))  // Reject
  .then(r => {            // Finally 1
    log.warn('TestPuppetWeb', 'finally()')
    return pw.quit()
  })
  .then(r => { t.end() }) // Finally 2
  .catch(e => t.fail(e))  // Exception
})

// WTF?
false && test('Puppet Web server/browser communication', function(t) {
  let pw2
  co(function* () {
    pw = new PuppetWeb({port: PORT, head: HEAD, session: SESSION})
    t.ok(pw2, 'new PuppetWeb')

    yield Promise.resolve()

    yield pw2.init()
    t.pass('pw2 inited')

    const retSocket = yield dingSocket(pw2.server)
    t.equal(retSocket,  'dong', 'dingSocket got dong')
  })
  .catch(e => {
    log.warn('TestPuppetWeb', 'error: %s', e)
    t.fail(e)
  })      // Reject
  .then(r => {                // Finally
    pw2.quit()
    t.end()
  })
  .catch(e => { t.fail(e) })  // Exception

})

false && test('Puppet Web WTF server/browser communication', function(t) {
  pw = new PuppetWeb({port: PORT, head: HEAD, session: SESSION})
  t.ok(pw, 'new PuppetWeb')

  pw.init()
  .then(r => {
    t.pass('pw inited')

    return dingSocket(pw.server)
  })
  .then(retSocket => {
    t.equal(retSocket,  'dong', 'dingSocket got dong')
    return true
  })
  .catch(e => {               // Reject
    log.warn('TestPuppetWeb', 'error: %s', e)
    t.fail(e)
    throw e
  })
  .then(r => {                // Finally 1
    t.pass('dingSocket resolved')
    return pw.quit()
  })
  .then(r => {                // Finally 2
    t.pass('pw.quit() resolved')
    t.end()
  })
  .catch(e => {
    t.fail(e)
    throw e
  })  // Exception
})

test('Puppet Web browser session save & load', function(t) {
  let pw = new PuppetWeb({port: PORT, head: HEAD, session: SESSION})
  t.ok(pw, 'new PuppetWeb')

  co(function* () {
    yield pw.init()
    t.pass('pw inited')

    const EXPECTED_COOKIE = {
      name: 'wechaty_save_to_session'
      , value: '### This cookie should be saved to session file, and load back at next PuppetWeb init  ###'
      , path: '/'
      , domain: '.qq.com'
      , secure: false
      , expiry: 99999999999999
    }
    const EXPECTED_NAME_REGEX = new RegExp('^' + EXPECTED_COOKIE.name + '$')

    yield pw.browser.driver.manage().deleteAllCookies()
    let cookies = yield pw.browser.driver.manage().getCookies()
    t.equal(cookies.length, 0, 'should no cookie after deleteAllCookies()')

    yield pw.browser.addCookies(EXPECTED_COOKIE)
    const cookieFromBrowser = yield pw.browser.driver.manage().getCookie(EXPECTED_COOKIE.name)
    t.equal(cookieFromBrowser.name, EXPECTED_COOKIE.name, 'cookie from getCookie() should be same as we just set')

    let cookiesFromCheck = yield pw.checkSession()
    t.ok(cookiesFromCheck.length, 'should get cookies from checkSession() after addCookies()')
    let cookieFromCheck  = cookiesFromCheck.filter(c => EXPECTED_NAME_REGEX.test(c.name))
    t.equal(cookieFromCheck[0].name, EXPECTED_COOKIE.name, 'cookie from checkSession() return should be same as we just set by addCookies()')

    const cookiesFromSave = yield pw.saveSession()
    t.ok(cookiesFromSave.length, 'should get cookies from saveSession()')
    const cookieFromSave  = cookiesFromSave.filter(c => EXPECTED_NAME_REGEX.test(c.name))
    t.equal(cookieFromSave.length, 1, 'should has the cookie we just set')
    t.equal(cookieFromSave[0].name, EXPECTED_COOKIE.name, 'cookie from saveSession() return should be same as we just set')

    yield pw.browser.driver.manage().deleteAllCookies()
    cookiesFromCheck = yield pw.checkSession()
    t.equal(cookiesFromCheck.length, 0, 'should no cookie from checkSession() after deleteAllCookies()')

    const cookiesFromLoad = yield pw.loadSession().catch(() => {}) // fall safe
    t.ok(cookiesFromLoad.length, 'should get cookies after loadSession()')
    const cookieFromLoad = cookiesFromLoad.filter(c => EXPECTED_NAME_REGEX.test(c.name))
    t.equal(cookieFromLoad[0].name, EXPECTED_COOKIE.name, 'cookie from loadSession() should has expected cookie')

    cookiesFromCheck = yield pw.checkSession()
    t.ok(cookiesFromCheck.length, 'should get cookies from checkSession() after loadSession()')
    cookieFromCheck  = cookiesFromCheck.filter(c => EXPECTED_NAME_REGEX.test(c.name))
    t.ok(cookieFromCheck.length, 'should has cookie after filtered after loadSession()')
    t.equal(cookieFromCheck[0].name, EXPECTED_COOKIE.name, 'cookie from checkSession() return should has expected cookie after loadSession')

    yield pw.quit()
    t.pass('quited')

    pw = new PuppetWeb({port: PORT, head: HEAD, session: SESSION})
    yield pw.init()
    t.pass('re-new/init/open PuppetWeb')

    const cookieAfterQuit = yield pw.browser.driver.manage().getCookie(EXPECTED_COOKIE.name)
    t.equal(cookieAfterQuit.name, EXPECTED_COOKIE.name, 'cookie from getCookie() after browser quit, should load the right cookie back')

  })
  .catch(e => {               // Reject
    log.warn('TestPuppetWeb', 'error: %s', e)
    t.fail(e)
  })
  .then(r => {                // Finally
    pw.quit()
    t.end()
    // clean
    require('fs').unlink(SESSION, err => {
      if (err) {
        log.warn('TestPuppetWeb', 'unlink session file %s fail: %s', SESSION, err)
      }
    })
  })
  .catch(e => { t.fail(e) })  // Exception

})
