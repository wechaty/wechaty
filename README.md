[![Wechaty](https://chatie.io/wechaty/images/wechaty-logo-en.png)](https://github.com/chatie/wechaty)

WECHATY
-------

## Connecting ChatBots.

Wechaty is a Bot Framework for Wechat **Personal** Account which can help you create a bot in 6 lines of javascript, with cross-platform support include [Linux](https://travis-ci.org/chatie/wechaty), [Windows](https://ci.appveyor.com/project/chatie/wechaty), [Darwin(OSX/Mac)](https://travis-ci.org/chatie/wechaty) and [Docker](https://circleci.com/gh/chatie/wechaty).

[![node](https://img.shields.io/node/v/wechaty.svg?maxAge=604800)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-blue.svg)](https://www.typescriptlang.org/)
[![Repo Size](https://reposs.herokuapp.com/?path=Chatie/wechaty)](https://github.com/chatie/wechaty)

:octocat: <https://github.com/chatie/wechaty>  
:beetle: <https://github.com/chatie/wechaty/issues>  
:book: <https://github.com/chatie/wechaty/wiki>  
:whale: <https://hub.docker.com/r/zixia/wechaty>  

## Voice of the Developer

> "Wechaty is a great solution, I believe there would be much more users recognize it." [link](https://github.com/chatie/wechaty/pull/310#issuecomment-285574472)  
> -- @Gcaufy, Tencent Engineer, Author of [WePY](https://github.com/Tencent/wepy)

> "太好用，好用的想哭"  
> -- @xinbenlv, Google Engineer, Founder of HaoShiYou.org

> "最好的微信开发库" [link](http://weibo.com/3296245513/Ec4iNp9Ld?type=comment)  
> -- @Jarvis, Baidu Engineer

> "Wechaty让运营人员更多的时间思考如何进行活动策划、留存用户，商业变现" [link](http://mp.weixin.qq.com/s/dWHAj8XtiKG-1fIS5Og79g)  
> -- @lijiarui, CEO of BotOrange.

> "If you know js ... try Chatie/wechaty, it's easy to use."  
> -- @Urinx Uri Lee, Author of [WeixinBot(Python)](https://github.com/Urinx/WeixinBot)

See more at [Wiki:VoiceOfDeveloper](https://github.com/Chatie/wechaty/wiki/VoiceOfDeveloper)

## The World's Shortest ChatBot Code: 6 lines of JavaScript

```javascript
const { Wechaty } = require('wechaty') // import { Wechaty } from 'wechaty'

Wechaty.instance() // Singleton
.on('scan', (url, code) => console.log(`Scan QR Code to login: ${code}\n${url}`))
.on('login',       user => console.log(`User ${user} logined`))
.on('message',  message => console.log(`Message: ${message}`))
.start()
```
> **Notice: Wechaty requires Node.js version >= 8.5**

This bot can log all messages to the console.

You can find more examples from [Wiki](https://github.com/chatie/wechaty/wiki/Example) and [Example Directory](https://github.com/chatie/wechaty/blob/master/example/).

GETTING STARTED
---------------

## A Great Live Coding Tutorial

<div align="center">
<a target="_blank" href="https://blog.chatie.io/guide/2017/01/01/getting-started-wechaty.html"><img src="http://blog.chatie.io/download/2017/lijiarui-wechaty-quick-start-guide-video.jpg" border=0 width="60%"></a>
</div>

The above 15 minute video tutorial is a good start point if you are new to Wechaty.

> Source code in the video can be found at: [Wechaty Starter Repository](https://github.com/lijiarui/wechaty-getting-started)

## Run

Let's say, you have saved the above six line javascript example to `mybot.js`.

We have two options to run wechaty:

1. Docker
1. NPM

Notice: The published versions have always passed the CI tests. We highly recommend running wechaty with the versions installed by docker or npm instead of the latest master branch unless you are prepared to deal with the broken code problems. 

### Docker

[![Docker Pulls](https://img.shields.io/docker/pulls/zixia/wechaty.svg?maxAge=2592000)](https://hub.docker.com/r/zixia/wechaty/) [![Docker Stars](https://img.shields.io/docker/stars/zixia/wechaty.svg?maxAge=2592000)](https://hub.docker.com/r/zixia/wechaty/) [![Docker Layers](https://images.microbadger.com/badges/image/zixia/wechaty.svg)](https://microbadger.com/#/images/zixia/wechaty)

The **best practice** to use Wechaty is running with docker, because it's not only the most easy way to get started, but also protects you from the troubles of dependency problems. 

> Wechaty Docker supports both JavaScript and TypeScript. To use TypeScript just write in TypeScript and save with extension name `.ts`.

Get to know more about Wechaty Docker at [Wiki:Docker](https://github.com/chatie/wechaty/wiki/Docker).

1. Run JavaScript

```shell
$ docker run -ti --rm --volume="$(pwd)":/bot zixia/wechaty mybot.js # for JavaScript
```

1. Run TypeScript

```shell
$ docker run -ti --rm --volume="$(pwd)":/bot zixia/wechaty mybot.ts # for TypeScript
```

### NPM

[![NPM Version](https://badge.fury.io/js/wechaty.svg)](https://badge.fury.io/js/wechaty)
[![Downloads][downloads-image]][downloads-url]
[![Greenkeeper badge](https://badges.greenkeeper.io/Chatie/wechaty.svg)](https://greenkeeper.io/)

```shell
$ npm init
$ npm install wechaty

$ cat > mybot.js <<'_EOF_'
const { Wechaty } = require('wechaty')
const bot = Wechaty.instance()
console.log(bot.version())
_EOF_

$ node mybot.js
```

Get to know more about NPM at [Wiki:NPM](https://github.com/chatie/wechaty/wiki/NPM)

TEST
----

[![Linux/Mac Build Status](https://img.shields.io/travis/Chatie/wechaty.svg?label=Linux/Mac)](https://travis-ci.org/Chatie/wechaty)
[![Windows Build status](https://img.shields.io/appveyor/ci/chatie/wechaty/master.svg?label=Windows)](https://ci.appveyor.com/project/chatie/wechaty)
[![Docker CircleCI](https://img.shields.io/circleci/project/github/Chatie/wechaty/master.svg?label=Docker)](https://circleci.com/gh/Chatie/wechaty)

[![Coverage Status](https://coveralls.io/repos/github/Chatie/wechaty/badge.svg?branch=master)](https://coveralls.io/github/Chatie/wechaty?branch=master)
[![Known Vulnerabilities](https://snyk.io/test/github/chatie/wechaty/badge.svg)](https://snyk.io/test/github/chatie/wechaty)

Wechaty is fully tested by unit tests and integration tests, with Continious Integration & Continious Deliver(CI/CD) support, which is powered by TravisCI, CircleCI and Appveyor CI.

To test Wechaty, run:
```shell
npm test
```

Get to know more about the tests from [Wiki:Test](https://github.com/chatie/wechaty/wiki/Test)

DOCUMATAION
-------------

In order to sync the doc with the lastest code, we are using [jsdoc](http://usejsdoc.org/) to describe the API, and use [jsdoc-to-markdown](https://github.com/jsdoc2md/jsdoc-to-markdown/wiki) to generate markdown format documents to the [docs](docs/index.md) directory.

See: [Official API Reference](https://chatie.github.io/wechaty/)

RELEASE NOTES
-------------

* [Latest Release](https://github.com/chatie/wechaty/releases/latest)(All releases [here](https://github.com/chatie/wechaty/releases))
* [Changelog](https://github.com/chatie/wechaty/blob/master/CHANGELOG.md)

POWERED BY WECHATY
------------------

[![Powered by Wechaty](https://img.shields.io/badge/Powered%20By-Wechaty-green.svg)](https://github.com/chatie/wechaty)

## Wechaty Badge

Get embed html/markdown code from [Wiki:PoweredByWechaty](https://github.com/chatie/wechaty/wiki/PoweredByWechaty)

## Projects Using Wechaty

1. [一个用CNN深度神剧网络给图片评分的wechaty项目](https://github.com/huyingxi/wechaty_selfie)
1. [Relay between Telegram and WeChat](https://github.com/Firaenix/TeleChatRelay)
1. [A chat bot managing the HaoShiYou wechat groups run by volunteers of haoshiyou.org](https://github.com/xinbenlv/haoshiyou-bot)
1. [An interactive chat bot to manage a TODO list](https://github.com/coderbunker/candobot)
1. [Forward WeChat messages to telegram](https://github.com/luosheng/Wegram)

Learn more about Projects Using Wechaty at [Wiki:PoweredByWechaty](https://github.com/chatie/wechaty/wiki/PoweredByWechaty)

## Find a Good Server

The best practice for running Wechaty Docker/NPM is using a VPS(Virtual Private Server) outside of China, which can save you hours of time because `npm install` and `docker pull` will run smoothly without any problem. 

The following VPS providers are used by the Wechaty team, and they worked perfectly in production. You can use the following link to get one in minutes. Also, doing this can support Wechaty because you are referred by us.

| Location  | Price | Ram     | Payment           | Provider |
| ---       | ---   | ---     | ---               | ---      |
| Singapore | $5    | 512MB   | Paypal            | [DigitalOcean](https://m.do.co/c/01a54778df5c) |
| Japan     | $5    | 1GB     | Paypal            | [Linode](https://www.linode.com/?r=5fd2b713d711746bb5451111df0f2b6d863e9f63) |
| Korea     | $10   | 1GB     | Alipay, Paypal    | [Netdedi](https://www.netdedi.com/?affid=35) |


## See Also

* [RelatedProject](https://github.com/chatie/wechaty/wiki/RelatedProject)

CONTRIBUTING
--------------

[![Issue Stats](http://issuestats.com/github/chatie/wechaty/badge/pr)](http://issuestats.com/github/chatie/wechaty)
[![Issue Stats](http://issuestats.com/github/chatie/wechaty/badge/issue)](http://issuestats.com/github/chatie/wechaty)
[![Join the chat at https://gitter.im/zixia/wechaty](https://badges.gitter.im/zixia/wechaty.svg)](https://gitter.im/zixia/wechaty?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Howto [contribute](https://github.com/chatie/wechaty/blob/master/CONTRIBUTING.md)

Contributions in any form are highly encouraged and welcome! Be it new or improved presets, optimized streaming code or just some cleanup. So start forking!

## Contributors List

https://github.com/Chatie/wechaty/wiki/Contributors

## Code Contributions

If you want to add new features or change the API, please submit an issue first to make sure no one else is already working on the same thing and discuss the implementation and API details with maintainers and users by creating an issue. When everything is settled down, you can submit a pull request.

When fixing bugs, you can directly submit a pull request.

Make sure to add tests for your features and bugfixes and update the documentation (see below) before submitting your code!

## Documentation Contributions

You can directly submit pull requests for documentation changes.

## Join US

Wechaty is used in many ChatBot projects by hundreds of developers. If you want to talk with other developers, just scan the following QR Code in WeChat with secret code _wechaty_, join our **Wechaty Developers' Home**.

![Wechaty Developers' Home](https://chatie.io/wechaty/images/bot-qr-code.png)

Scan now, because other Wechaty developers want to talk with you too! (secret code: _wechaty_)

## Future Improvements

Wechaty is far from perfect. The following things should be addressed in the future:

- [ ] PuppetWine - Use DLL Inject to hook Windows Wechat Application, run from wine inside docker.
- [ ] PuppetAndroid - Use Xposed to Hook Android Pad version of Wechat App, run from android emulator inside docker.


AUTHOR
------
[Huan LI](http://linkedin.com/in/zixia) \<zixia@zixia.net\>

<a href="https://stackexchange.com/users/265499">
  <img src="https://stackexchange.com/users/flair/265499.png" width="208" height="58" alt="profile for zixia on Stack Exchange, a network of free, community-driven Q&amp;A sites" title="profile for zixia on Stack Exchange, a network of free, community-driven Q&amp;A sites">
</a>

## My Story

My daily life/work depends on too much chat on wechat.
* I almost have 14,000 wechat friends in May 2014, before wechat restricts a total number of friends to 5,000.
* I almost have 400 wechat rooms, and most of them have more than 400 members.

Can you imagine that? I'm dying...

So a tireless bot working for me 24x7 on wechat, monitoring/filtering the most important message is badly needed. For example, it highlights discussion which contains the KEYWORDS which I want to follow up(especially in a noisy room). ;-)

At last, It's built for my personal study purpose of Automatically Testing.

COPYRIGHT & LICENSE
-------------------
* Code & Docs © 2016-2017 Huan LI \<zixia@zixia.net\>
* Code released under the Apache-2.0 License
* Docs released under Creative Commons

[downloads-image]: http://img.shields.io/npm/dm/wechaty.svg?style=flat-square
[downloads-url]: https://npmjs.org/package/wechaty

