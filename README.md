
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

> "Wechaty is a great solution, I believe there would be much more users recognize it." [link](https://github.com/chatie/wechaty/pull/310#issuecomment-285574472)  
> -- @Gcaufy, Tencent

> "太好用，好用的想哭"  
> -- @xinbenlv, Google Engineer, HaoShiYou.org Founder

> "最好的微信开发库" [link](http://weibo.com/3296245513/Ec4iNp9Ld?type=comment)  
> -- @Jarvis, Baidu Developer

> "Wechaty让运营人员更多的时间思考如何进行活动策划、留存用户，商业变现" [link](http://mp.weixin.qq.com/s/dWHAj8XtiKG-1fIS5Og79g)  
> -- @lijiarui, Orange Interactive CEO.

> "If you know js ... try Chatie/wechaty, it's easy to use."  
> -- @Urinx Uri Lee, Author of WeixinBot

See more at [Wiki:VoiceOfDeveloper](https://github.com/Chatie/wechaty/wiki/VoiceOfDeveloper)

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

API Reference
-------------

In order to sync the doc with the lastest code, we are using [jsdoc](http://usejsdoc.org/) to describe the API, and use [jsdoc-to-markdown](https://github.com/jsdoc2md/jsdoc-to-markdown/wiki) to generate markdown format documents to the [docs](docs/index.md) directory.

See: [Official API Reference](https://chatie.github.io/wechaty/)


[comment]: # (JSDOC SYNC BEGIN) 

* [Wechaty](http://chatie.io/wechaty/#Wechaty)
    * [wechaty.init()](http://chatie.io/wechaty/#Wechaty+init) ⇒ <code>Promise.&lt;void&gt;</code>
    * [wechaty.on(event, listener)](http://chatie.io/wechaty/#Wechaty+on) ⇒ [<code>Wechaty</code>](http://chatie.io/wechaty/#Wechaty)
    * [wechaty.quit()](http://chatie.io/wechaty/#Wechaty+quit) ⇒ <code>Promise.&lt;void&gt;</code>
    * [wechaty.logout()](http://chatie.io/wechaty/#Wechaty+logout) ⇒ <code>Promise.&lt;void&gt;</code>
    * [wechaty.self()](http://chatie.io/wechaty/#Wechaty+self) ⇒ [<code>Contact</code>](http://chatie.io/wechaty/#Contact)
    * [wechaty.say(content)](http://chatie.io/wechaty/#Wechaty+say) ⇒ <code>Promise.&lt;boolean&gt;</code>
    * [Wechaty.instance()](http://chatie.io/wechaty/#Wechaty.instance)
    * [Wechaty.version([forceNpm])](http://chatie.io/wechaty/#Wechaty.version) ⇒ <code>string</code>

* [Contact](http://chatie.io/wechaty/#Contact)
    * [contact.say(textOrMedia)](http://chatie.io/wechaty/#Contact+say) ⇒ <code>Promise.&lt;boolean&gt;</code>
    * [contact.name()](http://chatie.io/wechaty/#Contact+name) ⇒ <code>string</code>
    * [contact.alias(newAlias)](http://chatie.io/wechaty/#Contact+alias) ⇒ <code>string</code> \| <code>null</code> \| <code>Promise.&lt;boolean&gt;</code>
    * [contact.stranger()](http://chatie.io/wechaty/#Contact+stranger) ⇒ <code>boolean</code> \| <code>null</code>
    * [contact.official()](http://chatie.io/wechaty/#Contact+official) ⇒ <code>boolean</code> \| <code>null</code>
    * [contact.special()](http://chatie.io/wechaty/#Contact+special) ⇒ <code>boolean</code> \| <code>null</code>
    * [contact.personal()](http://chatie.io/wechaty/#Contact+personal) ⇒ <code>boolean</code> \| <code>null</code>
    * [contact.star()](http://chatie.io/wechaty/#Contact+star) ⇒ <code>boolean</code>
    * [contact.gender()](http://chatie.io/wechaty/#Contact+gender) ⇒ <code>Gender.Male(2)</code> \| <code>Gender.Female(1)</code> \| <code>Gender.Unknown(0)</code>
    * [contact.province()](http://chatie.io/wechaty/#Contact+province) ⇒ <code>string</code> \| <code>undefined</code>
    * [contact.city()](http://chatie.io/wechaty/#Contact+city) ⇒ <code>string</code> \| <code>undefined</code>
    * [contact.avatar()](http://chatie.io/wechaty/#Contact+avatar) ⇒ <code>Promise.&lt;NodeJS.ReadableStream&gt;</code>
    * [contact.refresh()](http://chatie.io/wechaty/#Contact+refresh) ⇒ <code>Promise.&lt;this&gt;</code>
    * [contact.self()](http://chatie.io/wechaty/#Contact+self) ⇒ <code>boolean</code>
    * [Contact.find(query)](http://chatie.io/wechaty/#Contact.find) ⇒ <code>Promise.&lt;(Contact\|null)&gt;</code>
    * [Contact.findAll([queryArg])](http://chatie.io/wechaty/#Contact.findAll) ⇒ <code>Promise.&lt;Array.&lt;Contact&gt;&gt;</code>


* [Room](http://chatie.io/wechaty/#Room)
    * [room.say(textOrMedia, [replyTo])](http://chatie.io/wechaty/#Room+say) ⇒ <code>Promise.&lt;boolean&gt;</code>
    * [room.on(event, listener)](http://chatie.io/wechaty/#Room+on) ⇒ <code>this</code>
    * [room.add(contact)](http://chatie.io/wechaty/#Room+add) ⇒ <code>Promise.&lt;number&gt;</code>
    * [room.del(contact)](http://chatie.io/wechaty/#Room+del) ⇒ <code>Promise.&lt;number&gt;</code>
    * [room.topic([newTopic])](http://chatie.io/wechaty/#Room+topic) ⇒ <code>string</code> \| <code>void</code>
    * [room.alias(contact)](http://chatie.io/wechaty/#Room+alias) ⇒ <code>string</code> \| <code>null</code>
    * [room.roomAlias(contact)](http://chatie.io/wechaty/#Room+roomAlias) ⇒ <code>string</code> \| <code>null</code>
    * [room.has(contact)](http://chatie.io/wechaty/#Room+has) ⇒ <code>boolean</code>
    * [room.memberAll(queryArg)](http://chatie.io/wechaty/#Room+memberAll) ⇒ [<code>Array.&lt;Contact&gt;</code>](http://chatie.io/wechaty/#Contact)
    * [room.member(queryArg)](http://chatie.io/wechaty/#Room+member) ⇒ [<code>Contact</code>](http://chatie.io/wechaty/#Contact) \| <code>null</code>
    * [room.memberList()](http://chatie.io/wechaty/#Room+memberList) ⇒ [<code>Array.&lt;Contact&gt;</code>](http://chatie.io/wechaty/#Contact)
    * [room.refresh()](http://chatie.io/wechaty/#Room+refresh) ⇒ <code>Promise.&lt;void&gt;</code>
    * [Room.create(contactList, [topic])](http://chatie.io/wechaty/#Room.create) ⇒ [<code>Promise.&lt;Room&gt;</code>](http://chatie.io/wechaty/#Room)
    * [Room.findAll([query])](http://chatie.io/wechaty/#Room.findAll) ⇒ <code>Promise.&lt;Array.&lt;Room&gt;&gt;</code>
    * [Room.find(query)](http://chatie.io/wechaty/#Room.find) ⇒ <code>Promise.&lt;(Room\|null)&gt;</code>


* [Message](http://chatie.io/wechaty/#Message)
    * [message.say(textOrMedia, [replyTo])](http://chatie.io/wechaty/#Message+say) ⇒ <code>Promise.&lt;any&gt;</code>
    * [message.from()](http://chatie.io/wechaty/#Message+from) ⇒ [<code>Contact</code>](http://chatie.io/wechaty/#Contact)
    * [message.room()](http://chatie.io/wechaty/#Message+room) ⇒ [<code>Room</code>](http://chatie.io/wechaty/#Room) \| <code>null</code>
    * [message.content()](http://chatie.io/wechaty/#Message+content) ⇒ <code>string</code>
    * [message.type()](http://chatie.io/wechaty/#Message+type) ⇒ [<code>MsgType</code>](http://chatie.io/wechaty/#MsgType)
    * [message.typeSub()](http://chatie.io/wechaty/#Message+typeSub) ⇒ [<code>MsgType</code>](http://chatie.io/wechaty/#MsgType)
    * [message.typeApp()](http://chatie.io/wechaty/#Message+typeApp) ⇒ [<code>AppMsgType</code>](http://chatie.io/wechaty/#AppMsgType)
    * [message.typeEx()](http://chatie.io/wechaty/#Message+typeEx) ⇒ [<code>MsgType</code>](http://chatie.io/wechaty/#MsgType)
    * [message.self()](http://chatie.io/wechaty/#Message+self) ⇒ <code>boolean</code>
    * [message.mentioned()](http://chatie.io/wechaty/#Message+mentioned) ⇒ [<code>Array.&lt;Contact&gt;</code>](http://chatie.io/wechaty/#Contact)
    * [message.to()](http://chatie.io/wechaty/#Message+to) ⇒ [<code>Contact</code>](http://chatie.io/wechaty/#Contact) \| <code>null</code>
    * [message.readyStream()](http://chatie.io/wechaty/#Message+readyStream) ⇒ <code>Promise.&lt;Readable&gt;</code>
    * [Message.find()](http://chatie.io/wechaty/#Message.find)
    * [Message.findAll()](http://chatie.io/wechaty/#Message.findAll)

* [MediaMessage](http://chatie.io/wechaty/#MediaMessage)
    * [mediaMessage.ext()](http://chatie.io/wechaty/#MediaMessage+ext) ⇒ <code>string</code>
    * [mediaMessage.filename()](http://chatie.io/wechaty/#MediaMessage+filename) ⇒ <code>string</code>
    * [mediaMessage.readyStream()](http://chatie.io/wechaty/#MediaMessage+readyStream)
    * [mediaMessage.forward(sendTo)](http://chatie.io/wechaty/#MediaMessage+forward) ⇒ <code>Promise.&lt;boolean&gt;</code>

* [FriendRequest](http://chatie.io/wechaty/#FriendRequest)
    * [friendRequest.send(contact, [hello])](http://chatie.io/wechaty/#FriendRequest+send) ⇒ <code>Promise.&lt;boolean&gt;</code>
    * [friendRequest.accept()](http://chatie.io/wechaty/#FriendRequest+accept) ⇒ <code>Promise.&lt;boolean&gt;</code>

[comment]: # (JSDOC SYNC END)

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