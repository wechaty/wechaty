
## v0.5.1 master (2016/10) The First Typescript Version
1. Converted to Typescript (2016/10/11) [#40](https://github.com/wechaty/wechaty/issues/40)
1. Dockerize Wechaty for easy start [#66](https://github.com/wechaty/wechaty/issues/66)
1. Sayablization: Make Wechaty/Contact/Room `Sayable`, and all `this` inside wechaty event listeners are `Sayable` too. [#41](https://github.com/wechaty/wechaty/issues/41)
1. BREAKING CHANGE: global event `scan` listener arguments changed from 1 to 2: now is `function(this: Sayable, url: string, code: number)` instead of `function({url, code})` before.
1. add test with Node.js v7.0 in CI
1. add `npm run doctor` to diagnose wechaty and output useful debug information

## [v0.4.0](https://github.com/wechaty/wechaty/releases/tag/v0.4.0) (2016/10/9) The Latest Javascript Version
1. [#32](https://github.com/wechaty/wechaty/issues/32) Extend Room Class with:
  1. Global events: `room-join`, `room-leave`, `room-topic`
  1. Room events: `join`, `leave`, `topic`
  1. Create a new Room: `Room.create()`
  1. Add/Del/Topic for Room
  1. Other methods like nick/member/has/etc...
1. [#33](https://github.com/wechaty/wechaty/issues/33) New Class `FriendRequest` with:
  1. `Wechaty.on('friend', function(contact: Contact, request: FriendRequest) {})` with Wechaty new Event `friend`
  1. `request.accept()` to accept a friend request
  1. `requestsend()` to send new friend request

## v0.3.13 (2016/09)
1. Managed by Cloud Manager: https://app.wechaty.io
1. Dockerized & Published to docker hub as: [zixia/wechaty](https://hub.docker.com/r/zixia/wechaty/)
1. Add `reset` & `shutdown` to IO Event
1. Switch Unit Test Runner from Tape/Tap to [AVA](https://github.com/avajs/ava)
1. Move git resposity from zixia/wechaty to [wechaty/wechaty](https://github.com/wechaty/wechaty)

## v0.2.3 (2016/7/28)
1. add wechaty.io cloud management support: set environment variable `WECHATY_TOKEN` to enable io support
2. rename `WECHATY_SESSION` to `WECHATY_PROFILE` for better name
3. fix watchdog timer & reset bug

## v0.1.8 (2016/6/25)
1. add a watchdog to restore from unknown state
2. add support to download image message by `ImageMessage.readyStream()`
3. fix lots of stable issues with webdriver exceptions & injection js code compatible

## v0.1.1 (2016/6/10)
1. add support to save & restore wechat login session
1. add continuous integration tests on win32 platform. (powered by [AppVeyor](https://www.appveyor.com/))
1. add environment variables HEAD/PORT/SESSION/DEBUG to config Wechaty

## v0.0.10 (2016/5/28)
1. use event `scan` to show image url of login QR Code(and detect state change)
2. new examples: Tuling123 bot & api.AI bot
3. more unit tests
4. code coverage status

## v0.0.5 (2016/5/11)
1. Receive & send message
1. Show contacts info
1. Show rooms info
1. 1st usable version
1. Start coding from May 1st, 2016
