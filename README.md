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

* Wechaty Starter Repository for Docker - <https://github.com/Chatie/docker-wechaty-getting-started>

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

## API

Read the Full Documentation at [Wechaty Official API Reference](https://chatie.github.io/wechaty/)

### 1 Class `Wechaty`

Main bot class.

A `Bot` is a Wechaty instance that control a specific [wechaty-puppet](https://github.com/Chatie/wechaty/wiki/Puppet).

* `new Wechaty(options?: WechatyOptions)`
    1. `options.name?: string` the name of this bot(optional)
    2. `optoins.puppet?: string` select which puppet provider we want to use. must be one of the:
        1. [wechaty-puppet-puppeteer](https://github.com/chatie/wechaty-puppet-puppeteer) - Angular Hook for Web Wechat <- This is the DEFAULT
        2. [wechaty-puppet-wechat4u](https://github.com/chatie/wechaty-puppet-wechat4u) - HTTP API for Web Wechat
        3. [wechaty-puppet-padchat](https://github.com/lijiarui/wechaty-puppet-padchat) - iPad App Protocol
        4. [wechaty-puppet-ioscat](https://github.com/linyimin-bupt/wechaty-puppet-ioscat) - iPhone App Hook
        5. [wechaty-puppet-mock](https://github.com/chatie/wechaty-puppet-mock) - Mock for Testing
    3. `optoins.puppetOptions?: PuppetOptions` options for the puppet provider.

| Wechaty | API | Description |
| :--- | :--- | :---        |
| event | `login` | emit after bot login full successful |
| event | `logout` | emit after the bot log out |
| event | `friendship` | emit when someone sends bot a friend request|
| event | `message` | emit when there's a new message |
| event | `room-join` | emit when anyone join any room |
| event | `room-topic` | emit when someone change room topic |
| event | `room-leave` | emit when anyone leave the room |
| event | `room-invite` | emit when there is a room invitation |
| event | `scan` | emit when the bot needs to show you a QR Code for scanning |
|  | `start(): Promise<void>` | start the bot |
|  | `stop(): Promise<void>` | stop the bot |
|  | `logonoff(): boolean` | bot login status |
|  | `logout(): Promise<void>` | logout the bot |
|  | `userSelf(): ContactSelf` | get the login-ed bot contact |
|  | `say(text: string): Promise<void>` | let bot say `text` to itself |

### 2 Class `Contact`

All wechat contacts(friends/non-friends) will be encapsulated as a Contact.

| Contact | API | Description |
| :--- | :--- | :---        |
| static | `find(query: string): Promise<null \| Contact>` | find contact by name or alias, if the result more than one, return the first one. |
| static | `findAll(query: string): Promise<Contact[]>` | find contact by `name` or `alias` |
| property | `id: readonly string` | get contact id |
|  | `say(text: string): Promise<void>` | send text, Contact, or file to contact |
|  | `self(): boolean` | check if contact is self |
|  | `name(): string` | get the name from a contact |
|  | `alias(): Promise<string>` | get the alias for a contact |
|  | `alias(newAlias: string): Promise<void>` | set or delete the alias for a contact |
|  | `friend(): boolean` | check if contact is friend |
|  | `type(): ContactType` | return the type of the Contact |
|  | `provence(): string` | get the region 'province' from a contact |
|  | `city(): string` | get the region 'city' from a contact |
|  | `avatar(): Promise<FileBox>` | get avatar picture file stream |
|  | `gender(): ContactGender` | get gender from a contact |

#### 2.1 Class `ContactSelf`

Class `ContactSelf` is extended from `Contact`.

| ContactSelf | API | Description |
| :--- | :--- | :---        |
|  | `avatar(file: FileBox): Promise<void>` | set avatar for bot |
|  | `qrcode(): Promise<string>` | get qrcode for bot |
|  | `signature(text: string): Promise<void>` | set signature for bot |

#### 2.2 Class `Friendship`

Send, receive friend request, and friend confirmation events.

| Friendship | API | Description |
| :--- | :--- | :---        |
|  | `add(contact: Contact, hello?: string): Promise<void>` | send a friend invitation to contact |
|  | `accept(): Promise<void>` | accept Friend Request |
|  | `hello(): string` | get the hello string from a friendship invitation |
|  | `contact(): Contact` | get the contact from friendship |
|  | `type(): FriendshipType` | return the Friendship Type(unknown, confirm, receive, verify) |

### 3 Class `Message`

All wechat messages will be encapsulated as a Message.

| Message | API | Description |
| :--- | :--- | :---        |
| static | `find(query: string): Promise<null \| Message>` | find message in cache and return the first one |
| static | `findAll(query: string): Promise<Message[]>` | find messages in cache, return a message list |
|  | `from(): Contact` | get the sender from a message |
|  | `to(): Contact` | get the destination of the message |
|  | `room(): null \| Room` | get the room from the message.(If the message is not in a room, then will return `null`) |
|  | `text(): string` | get the text content of the message |
|  | `say(text: string): Promise<void>` | reply a Text, Media File , or contact message to the sender. |
|  | `type(): MessageType` | get the type from the message |
|  | `self(): boolean` | check if a message is sent by self |
|  | `mention(): Contact[]` | get message mentioned contactList. |
|  | `mentionSelf(): boolean` | check if a message is mention self |
|  | `forward(to: Contact): Promise<void>` | Forward the received message |
|  | `age(): number` | the number of seconds since it has been created |
|  | `date(): Date` | the time it was created |
|  | `toFileBox(): Promise<FileBox>` | extract the Media File from the Message, and put it into the FileBox. |
|  | `toContact(): Promise<Contact>` | get Share Card of the Message |

### 4 Class `Room`

All wechat rooms(groups) will be encapsulated as a Room.

| Room | API | Description |
| :--- | :--- | :---        |
| static | `create(contactList: Contact[], topic?: string): Promise<Room>` | create a new room |
| static | `find(query: string): Promise<null \| Room>` | Try to find a room by filter. If get many, return the first one. |
| static | `findAll(query: string): Promise<Room[]>` | Find all contacts in a room |
| property | `id: readonly string` |  |
| event | `join` | emit when anyone join any room |
| event | `topic` | emit when someone change room topic |
| event | `leave` | emit when anyone leave the room |
| event | `invite` | emit when receive a room invitation |
|  | `say(text: string): Promise<void>` | Send text,media file, contact card, or text with mention @mention contact inside Room |
|  | `add(contact: Contact): Promise<void>` | Add contact in a room |
|  | `del(contact: Contact): Promise<void>` | Delete a contact from the room |
|  | `quit(): Promise<void>` | Bot quit the room itself |
|  | `topic(): Promise<string>` | GET topic from the room |
|  | `topic(newTopic: string): Promise<void>` | SET topic from the room |
|  | `announce(text: string): Promise<void>` | SET/GET announce from the room |
|  | `qrcode(): Promise<string>` | Get QR Code of the Room from the room, which can be used as scan and join the room. |
|  | `alias(contact: Contact): Promise<string>` | Return contact's roomAlias in the room |
|  | `has(contact: Contact): Promise<boolean>` | Check if the room has member `contact` |
|  | `memberAll(query?: string): Promise<Contact[]>` | Find all contacts or with specific name in a room |
|  | `member(query: string): Promise<null \| Contact>` | Find all contacts in a room, if get many, return the first one. |
|  | `owner(): null \| Contact` | Get room's owner from the room. |

#### 4.1 Class `RoomInvitation`

Accept room invitation

| RoomInvitation | API | Description |
| :--- | :--- | :---        |
|  | `accept(): Promise<void>` | accept Room Invitation |
|  | `inviter(): Contact` | get the inviter from room invitation |
|  | `topic(): Promise<string>` | get the room topic from room invitation |
|  | `date(): Promise<Date>` | the time it was created |
|  | `age(): Promise<number>` | the number of seconds since it has been created |

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
