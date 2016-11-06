# Unit Test

Run unit tests

```shell
$ npm test
```

If you want to see full log messages

```shell
$ WECHATY_LOG=silly npm test
```


##

## Example Output

```bash
$ npm test

> wechaty@0.2.3 pretest /home/ubuntu/workspace
> npm run lint


> wechaty@0.2.3 lint /home/ubuntu/workspace
> eslint src test


> wechaty@0.2.3 test /home/ubuntu/workspace
> cross-env TAP_TIMEOUT=600 tap --reporter=tap test/*-spec.js

TAP version 13
    # Subtest: test/contact-spec.js
        # Subtest: Contact smoke testing
        ok 1 - id/UserName right
        ok 2 - UserName set
        ok 3 - NickName set
        ok 4 - toString()
        1..4
    ok 1 - Contact smoke testing # time=213.836ms

    1..1
    # time=326.734ms
ok 1 - test/contact-spec.js # time=631.879ms

    # Subtest: test/message-spec.js
        # Subtest: Message constructor parser test
        ok 1 - id right
        ok 2 - from right
        ok 3 - toString()
        1..3
    ok 1 - Message constructor parser test # time=27.72ms

        # Subtest: Message ready() promise testing
        ok 1 - id/MsgId right
        ok 2 - contact ready for FromUserName
        ok 3 - contact ready for FromNickName
        ok 4 - contact ready for ToUserName
        ok 5 - contact ready for ToNickName
        1..5
    ok 2 - Message ready() promise testing # time=413.647ms

        # Subtest: TBW: Message static method
        ok 1 - Message.find
        ok 2 - Message.findAll with limit 2
        1..2
    ok 3 - TBW: Message static method # time=7.324ms

    1..3
    # time=542.623ms
ok 2 - test/message-spec.js # time=846.417ms

    # Subtest: test/puppet-web-bridge-spec.js
        # Subtest: Bridge retry-promise testing
        ok 1 - retry-promise got NotTheTime when wait not enough
        ok 2 - retryPromise got "Okey" when wait enough
        1..2
    ok 1 - Bridge retry-promise testing # time=83.13ms

        # Subtest: Bridge smoking test
        ok 1 - should instanciated a browser
        ok 2 - should instanciated a bridge with mocked puppet
        ok 3 - should instanciated a browser
        ok 4 - should open success
        ok 5 - should injected wechaty
        ok 6 - should got dong after execute Wechaty.ding()
        ok 7 - should got a boolean after call proxyWechaty(isLogin)
        ok 8 - b.quit()
        ok 9 - browser.quit()
        1..9
    ok 2 - Bridge smoking test # time=1969.856ms

    1..2
    # time=2406.254ms
ok 3 - test/puppet-web-bridge-spec.js # time=2744.939ms

    # Subtest: test/puppet-web-browser-spec.js
        # Subtest: Browser class cookie smoking tests
        ok 1 - should instanciate a browser instance
        ok 2 - should inited
        ok 3 - should opened
        ok 4 - should got 2 after execute script 1+1
        ok 5 - should got plenty of cookies
        ok 6 - should no cookie anymore after deleteAllCookies()
        ok 7 - getCookies() should filter out the cookie named wechaty0
        ok 8 - getCookies() should filter out the cookie named wechaty1
        ok 9 - re-opened url
        ok 10 - getCookie() should get expected cookie named after re-open url
        ok 11 - should be a not dead browser
        ok 12 - should be a live browser
        1..12
    ok 1 - Browser class cookie smoking tests # time=2738.551ms

        # Subtest: Browser session save & load
        ok 1 - new Browser
        ok 2 - inited
        ok 3 - opened
        ok 4 - should no cookie after deleteAllCookies()
        ok 5 - cookie from getCookie() should be same as we just set
        ok 6 - should get cookies from checkSession() after addCookies()
        ok 7 - cookie from checkSession() return should be same as we just set by addCookies()
        ok 8 - should get cookies from saveSession()
        ok 9 - should has the cookie we just set
        ok 10 - cookie from saveSession() return should be same as we just set
        ok 11 - should no cookie from checkSession() after deleteAllCookies()
        ok 12 - should get cookies after loadSession()
        ok 13 - cookie from loadSession() should has expected cookie
        ok 14 - should get cookies from checkSession() after loadSession()
        ok 15 - should has cookie after filtered after loadSession()
        ok 16 - cookie from checkSession() return should has expected cookie after loadSession
        ok 17 - quited
        ok 18 - re-new/init/open Browser
        ok 19 - loadSession for new instance of Browser
        ok 20 - cookie from getCookie() after browser quit, should load the right cookie back
        1..20
    ok 2 - Browser session save & load # time=3703.605ms

    1..2
    # time=6768.282ms
ok 4 - test/puppet-web-browser-spec.js # time=7046.929ms

    # Subtest: test/puppet-web-event-spec.js
        # Subtest: Puppet Web Event smoking test
        ok 1 - should instantiated a PuppetWeb
        ok 2 - should be inited
10:04:25 WARN PuppetWebEvent onBrowserDead() co() set isBrowserBirthing true
        1..2
    ok 1 - Puppet Web Event smoking test # time=4429.701ms

    1..1
    # time=5307.687ms
ok 5 - test/puppet-web-event-spec.js # time=5601.53ms

    # Subtest: test/puppet-web-server-spec.js
        # Subtest: PuppetWebServer basic tests
        ok 1 - PuppetWebServer instance created
        ok 2 - create express
        ok 3 - create https server
        ok 4 - HttpsServer quited
        ok 5 - HttpsServer closed
        ok 6 - create socket io
        1..6
    ok 1 - PuppetWebServer basic tests # time=101.099ms

        # Subtest: PuppetWebServer smoke testing
        ok 1 - new server instance
        ok 2 - server:58788 inited
        ok 3 - ding https   got dong
        1..3
    ok 2 - PuppetWebServer smoke testing # time=75.06ms

    1..2
    # time=614.65ms
ok 6 - test/puppet-web-server-spec.js # time=1014.765ms

    # Subtest: test/puppet-web-spec.js
        # Subtest: PuppetWeb smoke testing
        ok 1 - should instantiated a PuppetWeb
        ok 2 - should be inited
        ok 3 - should be not logined
        ok 4 - should be logined after emit login event
        ok 5 - should be logouted after logout event
        1..5
    ok 1 - PuppetWeb smoke testing # time=2177.999ms

        # Subtest: Puppet Web server/browser communication
        ok 1 - should instantiated a PuppetWeb
        ok 2 - should be inited
        ok 3 - should got EXPECTED_DING_DATA after resolved dingSocket()
        1..3
    ok 2 - Puppet Web server/browser communication # time=4453.266ms

        # Subtest: Puppet Web Self Message Identification
        ok 1 - should instantiated a PuppetWeb
        ok 2 - should identified self for message which from is self
        1..2
    ok 3 - Puppet Web Self Message Identification # time=3.77ms

    1..3
    # time=7388.271ms
ok 7 - test/puppet-web-spec.js # time=7734.744ms

    # Subtest: test/puppet-web-watchdog-spec.js
        # Subtest: Puppet Web watchdog timer
        ok 1 - should instantiate a PuppetWeb
        ok 2 - should get event[error] after watchdog timeout
        ok 3 - set log.level = silent to mute log when watchDog reset wechaty temporary
        ok 4 - should get EXPECTED_DING_DATA from ding after watchdog reset, and restored log level
        1..4
    ok 1 - Puppet Web watchdog timer # time=3261.171ms

    1..1
    # time=3898.268ms
ok 8 - test/puppet-web-watchdog-spec.js # time=4203.963ms

    # Subtest: test/room-spec.js
        # Subtest: Room smoke testing
        ok 1 - id/UserName right
        ok 2 - UserName set
        ok 3 - NickName set
        ok 4 - EncryChatRoomId set
        ok 5 - toString()
        1..5
    ok 1 - Room smoke testing # time=217.241ms

    1..1
    # time=312.937ms
ok 9 - test/room-spec.js # time=589.173ms

    # Subtest: test/web-util-spec.js
        # Subtest: Html smoking test
        ok 1 - should strip html as expected
        ok 2 - should unescape html as expected
        ok 3 - should digest emoji string 0 as expected
        ok 4 - should digest emoji string 1 as expected
        ok 5 - should convert plain text as expected
        1..5
    ok 1 - Html smoking test # time=13.157ms

        # Subtest: Media download smoking test
        ok 1 - should has cookies in req
        ok 2 - should has a cookie named life value 42
        ok 3 - should success download dong from downloadStream()
        1..3
    ok 2 - Media download smoking test # time=207.54ms

    1..2
    # time=314.788ms
ok 10 - test/web-util-spec.js # time=613.88ms

    # Subtest: test/webdriver-spec.js
        # Subtest: WebDriver process create & quit test
        ok 1 - should instanciate a browser
        ok 2 - should be inited successful
        ok 3 - should open successful
        ok 4 - should exist browser process after b.open()
        ok 5 - quited
        ok 6 - no driver process after quit
        1..6
    ok 1 - WebDriver process create & quit test # time=1971.315ms

        # Subtest: WebDriver smoke testing
        ok 1 - Browser instnace
        ok 2 - Bridge instnace
        ok 3 - should has no browser process before get()
        ok 4 - should init driver success
        ok 5 - should got injectio script
        ok 6 - should open wx.qq.com
        ok 7 - should exist browser process after get()
        ok 8 - should return 2 for execute 1+1 in browser
        ok 9 - should return a object contains status of inject operation
        ok 10 - should got code 200 for a success wechaty inject
        1..10
    ok 2 - WebDriver smoke testing # time=1812.719ms

    1..2
    # time=4121.1ms
ok 11 - test/webdriver-spec.js # time=4412.773ms

    # Subtest: test/wechaty-spec.js
        # Subtest: Wechaty Framework
        ok 1 - should export Wechaty
        ok 2 - should export Wechaty.Message
        ok 3 - should export Wechaty.Contact
        ok 4 - should export Wechaty.Room
        ok 5 - should export version in package.json
        1..5
    ok 1 - Wechaty Framework # time=634.931ms

    1..1
    # time=709.635ms
ok 12 - test/wechaty-spec.js # time=967.99ms

1..12
# time=36443.146ms
```

# BUG


## TAP & CI

```

mkdir a
cd a

npm init --yes

mkdir b
cd b

cat > bug.js <<__CODE__
const test  = require('tape')
const func = require('../w.js')

test('func param test', function(t) {
        const type = func({ data: 'direct call' })

        t.equal(type, 'default', 'should be default')
        t.end()
})
__CODE__

cat > ../w.js <<__CODE__
module.exports = function func(options) {
        const { type = 'default', data } = options || {}
        console.log('type=' + type + ', data=' + data)
        return type
}
__CODE__


npm install tap --save-dev

node bug.js
tap bug.js
```