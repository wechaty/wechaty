# WECHATY

[![Wechaty](https://chatie.io/wechaty/images/wechaty-logo-en.png)](https://github.com/chatie/wechaty)

## CONNECTING CHATBOTS

Wechaty is a Bot SDK for Wechat **Personal** Account which can help you create a bot in 6 lines of javascript, with cross-platform support include [Linux](https://travis-ci.com/chatie/wechaty), [Windows](https://ci.appveyor.com/project/chatie/wechaty), [Darwin(OSX/Mac)](https://travis-ci.com/chatie/wechaty) and [Docker](https://app.shippable.com/github/Chatie/wechaty).

[![NPM Version](https://badge.fury.io/js/wechaty.svg)](https://www.npmjs.com/package/wechaty)
[![Downloads](https://img.shields.io/npm/dm/wechaty.svg?style=flat-square)](https://www.npmjs.com/package/wechaty)
[![GitHub stars](https://img.shields.io/github/stars/Chatie/wechaty.svg?label=github%20stars)](https://github.com/chatie/wechaty)
[![Docker Pulls](https://img.shields.io/docker/pulls/zixia/wechaty.svg?maxAge=2592000)](https://hub.docker.com/r/zixia/wechaty/)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-blue.svg)](https://www.typescriptlang.org/)
[![Greenkeeper badge](https://badges.greenkeeper.io/Chatie/wechaty.svg)](https://greenkeeper.io/)

:octocat: <https://github.com/chatie/wechaty>  
:beetle: <https://github.com/chatie/wechaty/issues>  
:book: <https://github.com/chatie/wechaty/wiki>  
:whale: <https://hub.docker.com/r/zixia/wechaty>  

## VOICE OF THE DEVELOPER

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

See more at [Wiki:Voice Of Developer](https://github.com/Chatie/wechaty/wiki/Voice%20Of%20Developer)

## The World's Shortest ChatBot Code: 6 lines of JavaScript

```javascript

const { Wechaty } = require('wechaty') // import { Wechaty } from 'wechaty'

Wechaty.instance() // Global Instance
.on('scan', (qrcode, status) => console.log(`Scan QR Code to login: ${status}\nhttps://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrcode)}`))
.on('login',            user => console.log(`User ${user} logined`))
.on('message',       message => console.log(`Message: ${message}`))
.start()
```

> **Notice: Wechaty requires Node.js version >= 10**

This bot can log all messages to the console after login by scan.

You can find more examples from [Wiki](https://github.com/chatie/wechaty/wiki/Examples) and [Example Directory](https://github.com/chatie/wechaty/blob/master/examples/).

## REQUIREMENTS

1. Node.js 10 or above
1. Global Network Connection

## GETTING STARTED

[![node](https://img.shields.io/node/v/wechaty.svg?maxAge=604800)](https://nodejs.org/)

* Wechaty Starter Repository - <https://github.com/Chatie/wechaty-getting-started>

We have a Wechaty starter repository for beginners with the simplest setting. It will be **just work** out-of-the-box after you `clone` & `npm install` & `npm start`.

If you are new to Wechaty and want to try it the first time, we'd like to strong recommend you starting from this repository, and using it as your starter template for your project.

Otherwise, please saved the above _The World's Shortest ChatBot Code: 6 lines of JavaScript_ example to a file named `mybot.js` before you can use either NPM or Docker to run it.

### 1. NPM

[![NPM Version](https://badge.fury.io/js/wechaty.svg)](https://www.npmjs.com/package/wechaty)
[![npm (tag)](https://img.shields.io/npm/v/wechaty/next.svg)](https://www.npmjs.com/package/wechaty?activeTab=versions)
[![Downloads](https://img.shields.io/npm/dm/wechaty.svg?style=flat-square)](https://www.npmjs.com/package/wechaty)

```shell
npm init
npm install wechaty

# create your first mybot.js file, you can copy/paste from the above "The World's Shortest ChatBot Code: 6 lines of JavaScript"
# then:
node mybot.js
```

### 2. Docker

[![Docker Pulls](https://img.shields.io/docker/pulls/zixia/wechaty.svg?maxAge=2592000)](https://hub.docker.com/r/zixia/wechaty/) 
[![Docker Layers](https://images.microbadger.com/badges/image/zixia/wechaty.svg)](https://microbadger.com/#/images/zixia/wechaty)

> Wechaty Docker supports both JavaScript and TypeScript. To use TypeScript just write in TypeScript and save with extension name `.ts`, no need to compile because we use `ts-node` to run it.

2.1. Run JavaScript

```shell
# for JavaScript
docker run -ti --rm --volume="$(pwd)":/bot zixia/wechaty mybot.js
```

2.2. Run TypeScript

```shell
# for TypeScript
docker run -ti --rm --volume="$(pwd)":/bot zixia/wechaty mybot.ts
```

> Learn more about Wechaty Docker at [Wiki:Docker](https://github.com/chatie/wechaty/wiki/Docker).

## TEST

[![Ubuntu Linux/Mac Build Status](https://travis-ci.com/Chatie/wechaty.svg?branch=master)](https://travis-ci.com/Chatie/wechaty)
[![Travis](https://img.shields.io/travis/Chatie/wechaty.svg?label=Ubuntu/OSX)](https://travis-ci.com/Chatie/wechaty)
[![CentOS Linux Build Status](https://circleci.com/gh/Chatie/wechaty.svg?style=svg)](https://circleci.com/gh/Chatie/wechaty)
[![CircleCI](https://img.shields.io/circleci/project/github/Chatie/wechaty.svg?label=CentOS)](https://circleci.com/gh/Chatie/wechaty)
[![Windows Build Status](https://img.shields.io/appveyor/ci/chatie/wechaty/master.svg?label=Windows)](https://ci.appveyor.com/project/chatie/wechaty)
[![Docker Build Status](https://img.shields.io/shippable/5aaf8667ec373f17004dcb66.svg?label=Docker&color=brightgreen)](https://app.shippable.com/github/Chatie/wechaty)

[![Coverage Status](https://coveralls.io/repos/github/Chatie/wechaty/badge.svg?branch=master)](https://coveralls.io/github/Chatie/wechaty?branch=master)
[![Known Vulnerabilities](https://snyk.io/test/github/chatie/wechaty/badge.svg)](https://snyk.io/test/github/chatie/wechaty)

Wechaty is fully automatically tested by unit and integration tests, with Continious Integration & Continious Deliver(CI/CD) support powered by CI like Travis, Shippable and Appveyor.

To test Wechaty, run:

```shell
npm test
```

Get to know more about the tests from [Wiki:Tests](https://github.com/chatie/wechaty/wiki/Tests)

## API

This is a overview of most of the easy to use Wechaty APIs.

You can get the full Documentation from [Wechaty Official API Reference](https://chatie.github.io/wechaty/)

### 1 Class `Wechaty`

Main bot class.

A `Bot` is a Wechaty instance that control a specific [wechaty-puppet](https://github.com/Chatie/wechaty/wiki/Puppet).

#### 1.1 `new Wechaty(options: WechatyOptions)`

1. `options.name?: string` the name to identify this bot
2. `optoins.puppet?: string` select which puppet we use. must be one of
    1. [wechaty-puppet-puppeteer](https://github.com/chatie/wechaty-puppet-puppeteer) - Angular Hook for Web Wechat <- This is the DEFAULT
    2. [wechaty-puppet-wechat4u](https://github.com/chatie/wechaty-puppet-wechat4u) - HTTP API for Web Wechat
    3. [wechaty-puppet-padchat](https://github.com/lijiarui/wechaty-puppet-padchat) - iPad App Protocol
    4. [wechaty-puppet-ioscat](https://github.com/linyimin-bupt/wechaty-puppet-ioscat) - iPhone App Hook
3. `optoins.puppetOptions: PuppetOptions` puppet options.

#### 1.2 `wechaty.start(): Promise<void>` start the bot

#### 1.3 `wechaty.stop(): Promise<void>` stop the bot

#### 1.4 `wechaty.logonoff(): boolean` get the bot login/logout status

#### 1.5 `wechaty.logout(): Promise<void>` logout the bot

#### 1.6 `wechaty.userSelf(): ContactSelf` return the login-ed bot contact

#### 1.7 Event `wechaty.say(something)` let bot say something to itself

#### 1.8 Event `wechaty.on('login', ...)` emit after bot login full successful

#### 1.9 Event `wechaty.on('logout', ...)` emit after the bot log out

#### 1.10 Event `wechaty.on('friendship`, ...)` emit when someone sends bot a friend request

#### 1.11 Event `wechaty.on('message', ...)` emit when there's a new message

#### 1.12 Event `wechaty.on('room-join', ...)` emit when anyone join any room

#### 1.13 Event `wechaty.on('room-topic', ...)` emit when someone change room topic

#### 1.14 Event `wechaty.on('room-leave', ...)` emit when anyone leave the room

#### 1.15 Event `wechaty.on('room-invite', ...)` emit when there is a room invitation

#### 1.16 Event `wechaty.on('scan', ...)` A scan event will be emitted when the bot needs to show you a QR Code for scanning

### 2 Class `Contact`

All wechat contacts(friends/non-friends) will be encapsulated as a Contact.

#### 2.1 `Contact.find(query: string): Promise<Contact>`

#### 2.2 `Contact.findAll(query: string): Promise<Contact[]>`

#### 2.3 `contact.id: readonly string` Contact id

#### 2.4 `contact.say(something): Promise<void>` say something to this contact

#### 2.5 `contact.self(): boolean` whether this contact is the bot itself

#### 2.6 `contact.name(): string`

#### 2.7 `contact.alias(): Promise<string>` get alias

#### 2.8 `contact.alias(newAlias: string): Promise<void>` set alias

#### 2.9 `contact.friend(): boolean`

#### 2.10 `contact.type(): ContactType`

- ContactType.Unknown
- ContactType.Personal
- ContactType.Official

#### 2.11 `contact.province(): string`

#### 2.12 `contact.city(): string`

#### 2.13 `contact.avatar(): Promise<FileBox>` get profile avatar from contact

#### 2.14 `contact.gender(): ContactGender` get gender

- ContactGender.Unknown
- ContactGender.Male
- ContactGender.Female

### 3 Class `ContactSelf`

#### 3.1 `contactSelf.avatar(file: FileBox): Promise<void>` set avatar for bot

#### 3.2 `contactSelf.qrcode(): Promise<string>` get qrcode for bot

#### 3.3 `contactSelf.signature(signature: string)` set signature for bot

### 4 Class `Message`

All wechat messages will be encapsulated as a Message.

#### 4.1 `Message.find(query: string): Promise<Message>` search message in the recent cache

#### 4.2 `Message.findAll(query: string): Promise<Message[]>`

#### 4.3 `message.from(): Contact`

#### 4.4 `message.to(): Contact`

#### 4.5 `message.room(): null | Room`

#### 4.6 `message.text(): string`

#### 4.7 `message.say(text: string, mention?: Contact[]): Promise<void>`

#### 4.8 `message.type(): MessageType`

- MessageType.Text
- MessageType.Image
- MessageType.Audio
- MessageType.Video
- MessageType.Attachment

#### 4.9 `message.self(): boolean`

#### 4.10 `message.mention(): Contact[]`

#### 4.11 `message.mentionSelf(): boolean`

#### 4.12 `message.forward(to: Contact): Promise<void>`

#### 4.13 `message.age(): number`

#### 4.14 `message.toFileBox(): Promise<FileBox>`

#### 4.15 `message.toContact(): Promise<Contact>`

### 5 Class `Room`

All wechat rooms(groups) will be encapsulated as a Room.

#### 5.1 `room.create(contactList: Contact[], topic?: string): Promise<Room>`

#### 5.2 `room.find(query: string): Promise<null | Room>`

#### 5.3 `room.findAll(query?: string): Promise<room[]>`

#### 5.4 `room.id: readonly string`

#### 5.5 `room.say(something: string): Promise<void>`

#### 5.6 `room.add(contact: Contact): Promise<void>`

#### 5.7 `room.del(contact: Cotnact): Promise<void>`

#### 5.8 `room.quit(): Promise<void>`

#### 5.9 `room.topic(): Promise<string` get topic

#### 5.10 `room.topic(newTopic: string): Promise<void>` set topic

#### 5.11 `room.announce(announcement: string): Promise<void>`

#### 5.12`room.qrcode(): Promise<string>` get a qrcode for joining this room

#### 5.13 `room.alias(contact: Cotnact): Promise<string>` get the room alias from a room member contact

#### 5.14 `room.has(contact: Contact): Promise<boolean>`

#### 5.15 `room.memberAll(query?: string): Promise<Contact[]>`

#### 5.16 `room.member(query: string): Promise<null | Contact>`

#### 5.17 `room.owner(): null | Contact`

#### 5.18 Event `room.on('join', ...)` emit when anyone join any room

#### 5.19 Event `room.on('topic', ...)` emit when someone change room topic

#### 5.20 Event `room.on('leave', ...)` emit when anyone leave the room

### 6 Class `Friendship`

Send, receive friend request, and friend confirmation events.

#### 6.1 `Friendship.add(contact: Cotnact, hello?: string): Promise<void>` send a friend invitation to contact

#### 6.2 `friendship.accept(): Promise<void>`

#### 6.3 `friendship.hello(): string` get the hello string from a friendship invitation

#### 6.4 `friendship.contact(): Contact`

#### 6.5 `friendship.type(): FriendshipType`

- FriendshipType.Confirm
- FriendshipType.Receive
- FriendshipType.Verify

### 7 Class `RoomInvitation`

Accept room invitation

#### 7.1 `roomInvitation.accept(): Promise<void>`

#### 7.2 `roomInvitation.inviter(): Contact`

#### 7.3 `roomInvitation.topic(): Promise<string>`

#### 7.4 `roomInvitation.date(): Date`

## RELEASE NOTES

* [Latest Release](https://github.com/chatie/wechaty/releases/latest)(All releases [here](https://github.com/chatie/wechaty/releases))
* [Changelog](https://github.com/chatie/wechaty/blob/master/CHANGELOG.md)

## POWERED BY WECHATY

[![Powered by Wechaty](https://img.shields.io/badge/Powered%20By-Wechaty-blue.svg)](https://github.com/chatie/wechaty)
[![Donate Wechaty](https://img.shields.io/badge/Donate-Wechaty%20$-blue.svg)](https://salt.bountysource.com/checkout/amount?team=chatie)

### Wechaty Badge

```markdown
[![Powered by Wechaty](https://img.shields.io/badge/Powered%20By-Wechaty-blue.svg)](https://github.com/chatie/wechaty)
```

Get more embed html/markdown code from [Wiki:PoweredByWechaty](https://github.com/chatie/wechaty/wiki/PoweredByWechaty)

### Projects Using Wechaty

1. [一个用CNN深度神剧网络给图片评分的wechaty项目](https://github.com/huyingxi/wechaty_selfie)
2. [Relay between Telegram and WeChat](https://github.com/Firaenix/TeleChatRelay)
3. [A chat bot managing the HaoShiYou wechat groups run by volunteers of haoshiyou.org](https://github.com/xinbenlv/haoshiyou-bot)
4. [An interactive chat bot to manage a TODO list](https://github.com/coderbunker/candobot)
5. [Forward WeChat messages to telegram](https://github.com/luosheng/Wegram)

Pull Request is welcome to add yours!

Learn more about Projects Using Wechaty at [Wiki:PoweredByWechaty](https://github.com/chatie/wechaty/wiki/PoweredByWechaty)

## FIND A GOOD SERVER

The best practice for running Wechaty Docker/NPM is using a VPS(Virtual Private Server) outside of China, which can save you hours of time because `npm install` and `docker pull` will run smoothly without any problem.

The following VPS providers are used by the Wechaty team, and they worked perfectly in production. You can use the following link to get one in minutes. Also, doing this can support Wechaty because you are referred by us.

| Location  | Price | Ram     | Payment           | Provider |
| ---       | ---   | ---     | ---               | ---      |
| Singapore | $5    | 512MB   | Paypal            | [DigitalOcean](https://m.do.co/c/01a54778df5c) |
| Japan     | $5    | 1GB     | Paypal            | [Linode](https://www.linode.com/?r=5fd2b713d711746bb5451111df0f2b6d863e9f63) |
| Korea     | $10   | 1GB     | Alipay, Paypal    | [Netdedi](https://www.netdedi.com/?affid=35) |

## SEE ALSO

* [RelatedProject](https://github.com/chatie/wechaty/wiki/RelatedProject)

## CONTRIBUTING

[![Issue Stats](http://issuestats.com/github/chatie/wechaty/badge/pr)](http://issuestats.com/github/chatie/wechaty)
[![Issue Stats](http://issuestats.com/github/chatie/wechaty/badge/issue)](http://issuestats.com/github/chatie/wechaty)
[![Join the chat at https://gitter.im/zixia/wechaty](https://badges.gitter.im/zixia/wechaty.svg)](https://gitter.im/zixia/wechaty?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Howto [contribute](https://github.com/chatie/wechaty/blob/master/CONTRIBUTING.md)

Contributions in any form are highly encouraged and welcome! Be it new or improved presets, optimized streaming code or just some cleanup. So start forking!

### Contributors List

<https://github.com/Chatie/wechaty/wiki/Contributors>

### Code Contributions

If you want to add new features or change the API, please submit an issue first to make sure no one else is already working on the same thing and discuss the implementation and API details with maintainers and users by creating an issue. When everything is settled down, you can submit a pull request.

When fixing bugs, you can directly submit a pull request.

Make sure to add tests for your features and bugfixes and update the documentation (see below) before submitting your code!

### Documentation Contributions

You can directly submit pull requests for documentation changes.

### Join Us

Wechaty is used in many ChatBot projects by hundreds of developers. If you want to talk with other developers, just scan the following QR Code in WeChat with secret code _wechaty_, join our **Wechaty Developers' Home**.

![Wechaty Developers' Home](https://chatie.io/wechaty/images/bot-qr-code.png)

Scan now, because other Wechaty developers want to talk with you too! (secret code: _wechaty_)

## AUTHOR

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

## COPYRIGHT & LICENSE

* Code & Docs © 2016-2018 Huan LI \<zixia@zixia.net\>
* Code released under the Apache-2.0 License
* Docs released under Creative Commons
