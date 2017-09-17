[![Wechaty](https://chatie.io/wechaty/images/wechaty-logo-en.png)](https://github.com/chatie/wechaty)

# WECHATY

## Connecting ChatBots.

Wechaty is a Bot Framework for Wechat **Personal** Account which can help you create a bot in 6 lines of javascript by easy to use API, with cross-platform support include [Linux](https://travis-ci.org/chatie/wechaty), [Windows](https://ci.appveyor.com/project/chatie/wechaty), [Darwin(OSX/Mac)](https://travis-ci.org/chatie/wechaty) and [Docker](https://circleci.com/gh/chatie/wechaty).

[![node](https://img.shields.io/node/v/wechaty.svg?maxAge=604800)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-blue.svg)](https://www.typescriptlang.org/)
[![Repo Size](https://reposs.herokuapp.com/?path=Chatie/wechaty)](https://github.com/chatie/wechaty)

:octocat: <https://github.com/chatie/wechaty>  
:beetle: <https://github.com/chatie/wechaty/issues>  
:book: <https://github.com/chatie/wechaty/wiki>  
:whale: <https://hub.docker.com/r/zixia/wechaty>  

## Voice of the Developer

> I ... fall in love with it. It’s really easy to get started to make your own wechatbot. [link](http://blog.chatie.io/2017/05/25/use-interval-in-wechaty.html)  
> -- @kungfu-software, Founder of Kungfu Software

> "Wechaty is a great solution, I believe there would be much more users recognize it." [link](https://github.com/chatie/wechaty/pull/310#issuecomment-285574472)  
> -- @Gcaufy, Tencent 

> "The best wechat SDK I have seen in Github!" [link](https://github.com/chatie/wechaty/issues/8#issuecomment-228971491)  
> -- @JasLin, BotWave CTO

> "Wechaty简单的接口...和Docker化的封装...绝对是一个不错的选择" [link](http://mp.weixin.qq.com/s/o-4VMcAMz0K8yJVdNaUXow)  
> -- @shevyan, Ghost Cloud CEO

> "Wechaty is great." [link](https://github.com/chatie/wechaty/issues/36#issuecomment-251708382)  
> -- @Samurais, SnapLingo Director of Engineering

> "最好的微信开发库" [link](http://weibo.com/3296245513/Ec4iNp9Ld?type=comment)  
> -- @Jarvis, Baidu Developer

> "Wechaty让运营人员更多的时间思考如何进行活动策划、留存用户，商业变现" [link](http://mp.weixin.qq.com/s/dWHAj8XtiKG-1fIS5Og79g)  
> -- @lijiarui, Orange Interactive CEO.

> "太好用，好用的想哭"  
> -- @xinbenlv, Google Engineer, HaoShiYou.org Founder

> "If you know js ... try Chatie/wechaty, it's easy to use."  
> -- @Urinx Uri Lee, Author of WeixinBot

> "Wechaty library fantastic!" [link](https://github.com/chatie/wechaty/issues/9) - @ccaapton 

> "it's quite cool!" [link](https://github.com/chatie/wechaty/issues/4) - @ak5

> "Thanks for great SDK" [link](https://github.com/chatie/wechaty/issues/57) - @naishstar

> "Your docker solution is awesome!" [link](https://github.com/chatie/wechaty/issues/164#issuecomment-278633203) - @ax4 

# The World's Shortest ChatBot Code: 6 lines of JavaScript

```javascript
const { Wechaty } = require('wechaty') // import { Wechaty } from 'wechaty'

Wechaty.instance() // Singleton
.on('scan', (url, code) => console.log(`Scan QR Code to login: ${code}\n${url}`))
.on('login',       user => console.log(`User ${user} logined`))
.on('message',  message => console.log(`Message: ${message}`))
.init()
```
> **Notice: Wechaty requires Node.js version >= 6.9.0**

This bot can log all messages to the console.

You can find more examples from [Wiki](https://github.com/chatie/wechaty/wiki/Example) and [Example Directory](https://github.com/chatie/wechaty/blob/master/example/).

GETTING STARTED
----------------

## A Great Live Coding Tutorial

<div align="center">
<a target="_blank" href="https://blog.chatie.io/guide/2017/01/01/getting-started-wechaty.html"><img src="https://cloud.githubusercontent.com/assets/1361891/21722581/3ec957d0-d468-11e6-8888-a91c236e0ba2.jpg" border=0 width="60%"></a>
</div>

The above 10 minute video tutorial is a good start point if you are new to Wechaty.

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
-------

[![Linux/Mac Build Status](https://img.shields.io/travis/Chatie/wechaty.svg?label=Linux/Mac)](https://travis-ci.org/Chatie/wechaty)
[![Windows Build status](https://img.shields.io/appveyor/ci/chatie/wechaty/master.svg?label=Windows)](https://ci.appveyor.com/project/chatie/wechaty)
[![Docker CircleCI](https://img.shields.io/circleci/project/github/Chatie/wechaty/master.svg?label=Docker)](https://circleci.com/gh/Chatie/wechaty)

[![Coverage Status](https://coveralls.io/repos/github/Chatie/wechaty/badge.svg?branch=master)](https://coveralls.io/github/Chatie/wechaty?branch=master)
[![Known Vulnerabilities](https://snyk.io/test/github/chatie/wechaty/badge.svg)](https://snyk.io/test/github/chatie/wechaty)

Wechaty uses [AVA](https://github.com/avajs/ava) for unit testing

To test Wechaty, run:
```shell
npm test
```

Get to know more about the tests from [Wiki:Test](https://github.com/chatie/wechaty/wiki/Test)

DOCUMATAION
-------------

In order to sync the doc with the lastest code, it's best to use [jsdoc](http://usejsdoc.org/) to describe the API, and use [jsdoc-to-markdown](https://github.com/jsdoc2md/jsdoc-to-markdown/wiki) to generate markdown format documents to the [docs](docs/index.md) directory.

## API Reference

TODO: change links to jsdoc version: [API Document](docs/index.md)

### [Wechaty Events](http://chatie.io/wechaty/#wechatyeventname)

1. [scan](http://chatie.io/wechaty/#Wechaty+on) Emit when the bot needs to show you a QR Code for scanning
2. [login](http://chatie.io/wechaty/#Wechaty+on) Emit when bot login is fully successful.
3. [logout](http://chatie.io/wechaty/#Wechaty+on) Emit when bot detects log out.
4. [message](http://chatie.io/wechaty/#Wechaty+on) Emit when there's a new message.
5. [error](http://chatie.io/wechaty/#Wechaty+on) Emit when an error occurs.
6. [friend](http://chatie.io/wechaty/#Wechaty+on) Emit when a new friend request is received, or friendship is confirmed.
7. [room-join](http://chatie.io/wechaty/#Wechaty+on) Emit when someone joins the room
8. [room-leave](http://chatie.io/wechaty/#Wechaty+on) Emit when someone leaves the room
9. [room-topic](http://chatie.io/wechaty/#Wechaty+on) Emit when someone changes the room's topic

### [Wechaty](http://chatie.io/wechaty/#Wechaty)

1. [instance(setting: PuppetSetting): Promise&lt;Wechaty&gt;](http://chatie.io/wechaty/#Wechaty) get the bot instance
2. [init(): Promise&lt;void&gt;](http://chatie.io/wechaty/#Wechaty+init) Initialize the bot
4. [say(content: string): Promise&lt;void&gt;](http://chatie.io/wechaty/#Wechaty+say) send message to filehelper, just for logging/reporting usage for your convenience

### [Message](http://chatie.io/wechaty/#Message)

1. [from():Contact](http://chatie.io/wechaty/#Message+from) get the sender of a message
4. [to():Contact](http://chatie.io/wechaty/#messageto--contact--null) get the destination for the message
9. [room():Room|null](http://chatie.io/wechaty/#messageroom--room--null) get the room from a message.
7. [content():string](http://chatie.io/wechaty/#messagecontent--string) get the content of the message
12. [type():MsgType](http://chatie.io/wechaty/#messagetype--msgtype) get the type of a Message.
13. [say(content:string):Promise](http://chatie.io/wechaty/#Message+say) send a reply message to the sender.
15. [self():boolean](http://chatie.io/wechaty/#messageself--boolean) check if a message is sent by self 

### [Contact](http://chatie.io/wechaty/#Contact)

2. [name():string](http://chatie.io/wechaty/#Contact+name) get name from a contact
3. [alias():string](http://chatie.io/wechaty/#contactaliasnewalias--string--null--promiseboolean) get remark name from a contact
4. [alias(alias:string):Promise](http://chatie.io/wechaty/#contactaliasnewalias--string--null--promiseboolean) set remark name to a contact
6. [star():boolean](http://chatie.io/wechaty/#Contact+star) true for star friend, false for no star friend
8. [say(content:string):Promise](http://chatie.io/wechaty/#contactsaytextormedia--promiseboolean) send a message to a contact
8. [find():Promise](http://chatie.io/wechaty/#Contact.find) try to find a contact by filter: {name: string | RegExp} / {alias: string | RegExp}

### [Room](http://chatie.io/wechaty/#room)

1. [say(content:string,replyTo:Contact|ContactArray):Promise](http://chatie.io/wechaty/#Room+say) send a message inside Room.
3. [refresh():Promise](http://chatie.io/wechaty/#Room+refresh) reload data for Room
3. [add():Promise](http://chatie.io/wechaty/#roomaddcontact--promisenumber) add contact in a room
3. [del():Promise](http://chatie.io/wechaty/#Room+del) delete a contact from the room It works only when the bot is the owner of the room
3. [topic():string|void](http://chatie.io/wechaty/#Room+topic) SET/GET topic from the room
3. [find():Promise](http://chatie.io/wechaty/#Room.find) try to find a room by filter: {topic: string | RegExp}. If get many, return the first one.


#### [Room Event](http://chatie.io/wechaty/#Room+on)

1. [join](http://chatie.io/wechaty/#Room+on) Emit when someone joins the room
2. [leave](http://chatie.io/wechaty/#Room+on) Emit when someone leaves the room
3. [topic](http://chatie.io/wechaty/#Room+on) Emit when someone changes the room topic

### [FriendRequest](https://github.com/chatie/wechaty/wiki/API#class-friendrequest)

1. [hello:string](https://github.com/chatie/wechaty/wiki/API#friendrequesthello-string) get content from friendrequest
2. [accept():Promise](https://github.com/chatie/wechaty/wiki/API#friendrequestaccept-void) accept the friendrequest
3. [send(contact:Contact,hello:string):Promise](https://github.com/chatie/wechaty/wiki/API#friendrequestsendcontact-contact-hello-string-void) send a new friend request

### [MediaMessage](http://chatie.io/wechaty/#MediaMessage)

Create a media message object.

RELEASE NOTES
---------------

* [Latest Release](https://github.com/chatie/wechaty/releases/latest)(All releases [here](https://github.com/chatie/wechaty/releases))
* [Changelog](https://github.com/chatie/wechaty/blob/master/CHANGELOG.md)

POWERED BY WECHATY
-------------------

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

CONTRIBUTING
--------------

[![Issue Stats](http://issuestats.com/github/chatie/wechaty/badge/pr)](http://issuestats.com/github/chatie/wechaty)
[![Issue Stats](http://issuestats.com/github/chatie/wechaty/badge/issue)](http://issuestats.com/github/chatie/wechaty)
[![Join the chat at https://gitter.im/zixia/wechaty](https://badges.gitter.im/zixia/wechaty.svg)](https://gitter.im/zixia/wechaty?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Howto [contribute](https://github.com/chatie/wechaty/blob/master/CONTRIBUTING.md)

Contributions in any form are highly encouraged and welcome! Be it new or improved presets, optimized streaming code or just some cleanup. So start forking!

## Code Contributions

If you want to add new features or change the API, please submit an issue first to make sure no one else is already working on the same thing and discuss the implementation and API details with maintainers and users by creating an issue. When everything is settled down, you can submit a pull request.

When fixing bugs, you can directly submit a pull request.

Make sure to add tests for your features and bugfixes and update the documentation (see below) before submitting your code!

## Documentation Contributions

You can directly submit pull requests for documentation changes.

## Main Contributors

* [cherry-geqi](https://github.com/cherry-geqi)
* [Gcaufy](https://github.com/Gcaufy)
* [JasLin](https://github.com/JasLin)
* [lijiarui](https://github.com/lijiarui)
* [mukaiu](https://github.com/mukaiu)
* [xinbenlv](https://github.com/xinbenlv)

See more at <https://github.com/Chatie/wechaty/graphs/contributors>

## JOIN US

Wechaty is used in many ChatBot projects by hundreds of developers. If you want to talk with other developers, just scan the following QR Code in WeChat with secret code _wechaty_, join our **Wechaty Developers' Home** now.

![Wechaty Developers' Home](https://chatie.io/wechaty/images/bot-qr-code.png)

Scan now, because other Wechaty developers want to talk with you too! (secret code: _wechaty_)

SEE ALSO
---------

* [RelatedProject](https://github.com/chatie/wechaty/wiki/RelatedProject)

FUTURE IMPROVEMENTS
--------------
Wechaty is far from perfect. The following things should be addressed in the future:

- [ ] PuppetWine - Use DLL Inject to hook Windows Wechat Application, run from wine inside docker.
- [ ] PuppetAndroid - Use Xposed to Hook Android Pad version of Wechat App, run from android emulator inside docker.


MY STORY
--------
My daily life/work depends on too much chat on wechat.
* I almost have 14,000 wechat friends in May 2014, before wechat restricts a total number of friends to 5,000.
* I almost have 400 wechat rooms, and most of them have more than 400 members.

Can you imagine that? I'm dying...

So a tireless bot working for me 24x7 on wechat, monitoring/filtering the most important message is badly needed. For example, it highlights discussion which contains the KEYWORDS which I want to follow up(especially in a noisy room). ;-)

At last, It's built for my personal study purpose of Automatically Testing.

AUTHOR
------
Huan LI \<zixia@zixia.net\> (http://linkedin.com/in/zixia)

<a href="http://stackoverflow.com/users/1123955/zixia">
  <img src="http://stackoverflow.com/users/flair/1123955.png" width="208" height="58" alt="profile for zixia at Stack Overflow, Q&amp;A for professional and enthusiast programmers" title="profile for zixia at Stack Overflow, Q&amp;A for professional and enthusiast programmers">
</a>

COPYRIGHT & LICENSE
-------------------
* Code & Docs © 2016-2017 Huan LI \<zixia@zixia.net\>
* Code released under the Apache-2.0 License
* Docs released under Creative Commons

[downloads-image]: http://img.shields.io/npm/dm/wechaty.svg?style=flat-square
[downloads-url]: https://npmjs.org/package/wechaty

