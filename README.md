[![Wechaty](https://raw.githubusercontent.com/wechaty/wechaty/master/image/wechaty-logo-en.png)](https://github.com/wechaty/wechaty)

# Wechaty 

## Connecting ChatBots.

Wechaty is a Bot Framework for Wechat **Personal** Account that helps you easy creating bot in 6 lines of javascript, with cross-platform support include [Linux](https://travis-ci.org/wechaty/wechaty), [Windows](https://ci.appveyor.com/project/zixia/wechaty), [Darwin(OSX/Mac)](https://travis-ci.org/wechaty/wechaty) and [Docker](https://circleci.com/gh/wechaty/wechaty).

[![Join the chat at https://gitter.im/zixia/wechaty](https://badges.gitter.im/zixia/wechaty.svg)](https://gitter.im/zixia/wechaty?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge) [![node](https://img.shields.io/node/v/wechaty.svg?maxAge=2592000)](https://nodejs.org/) [![Repo Size](https://reposs.herokuapp.com/?path=wechaty/wechaty)](https://github.com/wechaty/wechaty)

:octocat: <https://github.com/wechaty/wechaty>  
:beetle: <https://github.com/wechaty/wechaty/issues>  
:book: <https://github.com/wechaty/wechaty/wiki>  
:whale: <https://hub.docker.com/r/zixia/wechaty>  

## Voice of the Developer

> @JasLin: it may be the best wechat SDK I have seen in Github! [link](https://github.com/wechaty/wechaty/issues/8#issuecomment-228971491)

> @ccaapton: wechaty library fantastic! [link](https://github.com/wechaty/wechaty/issues/9)

> @ak5: Thanks for this it's quite cool! [link](https://github.com/wechaty/wechaty/issues/4)

> @Samurais: wechaty is great.  [link](https://github.com/wechaty/wechaty/issues/36#issuecomment-251708382)

> @Jarvis: 目前用过的最好的微信开发库 [link](http://weibo.com/3296245513/Ec4iNp9Ld?type=comment)

> @naishstar: thanks for great SDK [link](https://github.com/wechaty/wechaty/issues/57)

# Example

The shortest wechat bot code in the world: 6 lines JavaScript

```javascript
const { Wechaty } = require('wechaty')

Wechaty.instance() // Singleton
.on('scan', (url, code) => console.log(`Scan QR Code to login: ${code}\n${url}`))
.on('login',       user => console.log(`User ${user} logined`))
.on('message',  message => console.log(`Message: ${message}`))
.init()
```

This bot can log all message to console. Source code(TypeScript version) at [here](https://github.com/wechaty/wechaty/blob/master/example/roger-bot.ts).

You can find more example from [Wiki](https://github.com/wechaty/wechaty/wiki/Example) and [Example Directory](https://github.com/wechaty/wechaty/blob/master/example/).

# Run

Let's say, you have saved the above six lines javascript example to `mybot.js`.

We have two options to run wechaty:

1. Docker
1. NPM

## Docker

[![Docker Pulls](https://img.shields.io/docker/pulls/zixia/wechaty.svg?maxAge=2592000)](https://hub.docker.com/r/zixia/wechaty/) [![Docker Stars](https://img.shields.io/docker/stars/zixia/wechaty.svg?maxAge=2592000)](https://hub.docker.com/r/zixia/wechaty/) [![Docker Layers](https://images.microbadger.com/badges/image/zixia/wechaty.svg)](https://microbadger.com/#/images/zixia/wechaty)

```shell
$ alias wechaty='docker run \
    -t -i --rm \
    --volume="$(pwd)":/bot \
    --name=wechaty \
    zixia/wechaty \
'

$ wechaty mybot.js
```

* Wechaty Docker has native support for TypeScript as well: just write in TypeScript and save to `mybot.ts`, then run `wechaty mybot.ts`.

Get to know more about Wechaty Docker from [here](https://github.com/wechaty/wechaty/wiki/Docker).

## NPM

[![NPM Version](https://badge.fury.io/js/wechaty.svg)](https://badge.fury.io/js/wechaty) [![Downloads][downloads-image]][downloads-url]

```shell
$ npm install --save wechaty

$ node mybot.js
```

You might be asked for install the `chromedriver`, depends on which platform you are.

# API Reference

## [Wechaty](https://github.com/wechaty/wechaty/wiki/API#class-wechaty)

1. [init(): Promise&lt;void&gt;](https://github.com/wechaty/wechaty/wiki/API#wechaty-init-promise-void)
1. [instance(setting: PuppetSetting): Promise&lt;Wechaty&gt;](https://github.com/wechaty/wechaty/wiki/API#wechaty-instance-setting-puppetsetting-promise-wechaty)
1. [send(message: Message): Promise&lt;void&gt;](https://github.com/wechaty/wechaty/wiki/API#wechaty-send-message-message-promise-void)
1. [say(content: string): Promise&lt;void&gt;](https://github.com/wechaty/wechaty/wiki/API#wechaty-say-content-string-promise-void)

### [Wechaty Event](https://github.com/wechaty/wechaty/wiki/API#wechaty-event)

1. [error](https://github.com/wechaty/wechaty/wiki/API#wechaty-event-error)
1. [friend](https://github.com/wechaty/wechaty/wiki/API#wechaty-event-friend)
1. [login](https://github.com/wechaty/wechaty/wiki/API#wechaty-event-login)
1. [logout](https://github.com/wechaty/wechaty/wiki/API#wechaty-event-logout)
1. [message](https://github.com/wechaty/wechaty/wiki/API#wechaty-event-message)
1. [room-join](https://github.com/wechaty/wechaty/wiki/API#wechaty-event-room-join)
1. [room-leave](https://github.com/wechaty/wechaty/wiki/API#wechaty-event-room-leave)
1. [room-topic](https://github.com/wechaty/wechaty/wiki/API#wechaty-event-room-topic)
1. [scan](https://github.com/wechaty/wechaty/wiki/API#wechaty-event-scan)

## [Contact](https://github.com/wechaty/wechaty/wiki/API#class-contact)

TBW

## [FriendRequest](https://github.com/wechaty/wechaty/wiki/API#class-friendrequest)

TBW

## [Message](https://github.com/wechaty/wechaty/wiki/API#class-message)

TBW

## [Room](https://github.com/wechaty/wechaty/wiki/API#class-room)

TBW

### [Room Event](https://github.com/wechaty/wechaty/wiki/API#room-event)


# Test

[![Linux/Mac Build Status](https://img.shields.io/travis/wechaty/wechaty.svg?label=Linux/Mac)](https://travis-ci.org/wechaty/wechaty) [![Windows Build status](https://img.shields.io/appveyor/ci/zixia/wechaty/master.svg?label=Windows)](https://ci.appveyor.com/project/zixia/wechaty) [![Docker CircleCI](https://img.shields.io/circleci/project/github/wechaty/wechaty.svg?label=Docker)](https://circleci.com/gh/wechaty/wechaty) [![Coverage Status](https://coveralls.io/repos/github/wechaty/wechaty/badge.svg?branch=master)](https://coveralls.io/github/wechaty/wechaty?branch=master)

Wechaty use [AVA](https://github.com/avajs/ava) for unit testing

To test Wechaty, run:
```shell
npm test
```

Get to know more about test from [here](https://github.com/wechaty/wechaty/wiki/Test)

# Release Notes

* [Latest Release](https://github.com/wechaty/wechaty/releases/latest)(All releases [here](https://github.com/wechaty/wechaty/releases))
* [Changelog](https://github.com/wechaty/wechaty/blob/master/CHANGELOG.md)

# Badge

[![Powered by Wechaty](https://img.shields.io/badge/Powered%20By-Wechaty-green.svg)](https://github.com/wechaty/wechaty)

Here's how to show the Wechaty Badge on your page: in case you are interested, or you'd like to support Wechaty by show the badge. Appreciate!

## Markdown

```markdown
[![Powered by Wechaty](https://img.shields.io/badge/Powered%20By-Wechaty-green.svg)](https://github.com/wechaty/wechaty)
```

## Html

```html
<a href="https://github.com/wechaty/wechaty" target="_blank">
  <img src="https://img.shields.io/badge/Powered%20By-Wechaty-green.svg" alt="Powered by Wechaty" border="0">
</a>
```

# Contributing

Howto [contribute](https://github.com/wechaty/wechaty/blob/master/CONTRIBUTING.md)

# See Also

* [RelatedProject](https://github.com/wechaty/wechaty/wiki/RelatedProject)

My Story
----------------
My daily life/work depends on too much chat on wechat.
* I almost have 14,000 wechat friends in May 2014, before wechat restricts a total number of friends to 5,000.
* I almost have 400 wechat rooms that most of them have more than 400 members.

Can you image that? I'm dying...

So a tireless bot working for me 24x7 on wechat, monitoring/filtering the most important message is badly needed. For example highlights discussion which contains the KEYWORDS which I want to follow up(especially in a noisy room). ;-)

At last, It's built for my personal study purpose of Automatically Testing.

Author
-----------------
Zhuohuan LI <zixia@zixia.net> (http://linkedin.com/in/zixia)

<a href="http://stackoverflow.com/users/1123955/zixia">
  <img src="http://stackoverflow.com/users/flair/1123955.png" width="208" height="58" alt="profile for zixia at Stack Overflow, Q&amp;A for professional and enthusiast programmers" title="profile for zixia at Stack Overflow, Q&amp;A for professional and enthusiast programmers">
</a>

Copyright & License
-------------------
* Code & Docs 2016© zixia
* Code released under the ISC license
* Docs released under Creative Commons

[downloads-image]: http://img.shields.io/npm/dm/wechaty.svg?style=flat-square
[downloads-url]: https://npmjs.org/package/wechaty
