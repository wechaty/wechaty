[![Wechaty](https://raw.githubusercontent.com/wechaty/wechaty/master/image/wechaty-logo-en.png)](https://github.com/wechaty/wechaty)

# Wechaty 

## Connecting ChatBots.

Wechaty is a Bot Framework for Wechat **Personal** Account that helps you easy creating bot in 6 lines of javascript, with cross-platform support include [Linux](https://travis-ci.org/wechaty/wechaty), [Windows](https://ci.appveyor.com/project/zixia/wechaty), [Darwin(OSX/Mac)](https://travis-ci.org/wechaty/wechaty) and [Docker](https://circleci.com/gh/wechaty/wechaty).

[![Join the chat at https://gitter.im/zixia/wechaty](https://badges.gitter.im/zixia/wechaty.svg)](https://gitter.im/zixia/wechaty?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge) [![node](https://img.shields.io/node/v/wechaty.svg?maxAge=604800)](https://nodejs.org/) [![Repo Size](https://reposs.herokuapp.com/?path=wechaty/wechaty)](https://github.com/wechaty/wechaty)

:octocat: <https://github.com/wechaty/wechaty>  
:beetle: <https://github.com/wechaty/wechaty/issues>  
:book: <https://github.com/wechaty/wechaty/wiki>  
:whale: <https://hub.docker.com/r/zixia/wechaty>  

## Voice of the Developer

> @JasLin: the best wechat SDK I have seen in Github! [link](https://github.com/wechaty/wechaty/issues/8#issuecomment-228971491)

> @Jarvis: 最好的微信开发库 [link](http://weibo.com/3296245513/Ec4iNp9Ld?type=comment)

> @ccaapton: wechaty library fantastic! [link](https://github.com/wechaty/wechaty/issues/9)

> @ak5: it's quite cool! [link](https://github.com/wechaty/wechaty/issues/4)

> @Samurais: wechaty is great.  [link](https://github.com/wechaty/wechaty/issues/36#issuecomment-251708382)

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

This bot can log all message to console.

You can find more example from [Wiki](https://github.com/wechaty/wechaty/wiki/Example) and [Example Directory](https://github.com/wechaty/wechaty/blob/master/example/).

# Run

Let's say, you have saved the above six lines javascript example to `mybot.js`.

We have two options to run wechaty:

1. Docker
1. NPM

## Docker

[![Docker Pulls](https://img.shields.io/docker/pulls/zixia/wechaty.svg?maxAge=2592000)](https://hub.docker.com/r/zixia/wechaty/) [![Docker Stars](https://img.shields.io/docker/stars/zixia/wechaty.svg?maxAge=2592000)](https://hub.docker.com/r/zixia/wechaty/) [![Docker Layers](https://images.microbadger.com/badges/image/zixia/wechaty.svg)](https://microbadger.com/#/images/zixia/wechaty)

```shell
$ docker run \
  -t -i --rm \
  --volume="$(pwd)":/bot \
  --name=wechaty \
  zixia/wechaty \
  mybot.js
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

Get to know more about NPM at [Wiki](https://github.com/wechaty/wechaty/wiki/NPM)

# API Reference

## [Wechaty Event](https://github.com/wechaty/wechaty/wiki/API#event)

1. [scan](https://github.com/wechaty/wechaty/wiki/API#1-event-scan) Emit when the bot needs to show you a QR Code for scanning
2. [login](https://github.com/wechaty/wechaty/wiki/API#2-event-login) Emit when bot login full successful.
3. [logout](https://github.com/wechaty/wechaty/wiki/API#3-event-logout) Emit when bot detected log out.
4. [message](https://github.com/wechaty/wechaty/wiki/API#4-event-message) Emit when there's a new message.
5. [error](https://github.com/wechaty/wechaty/wiki/API#5-event-error) Emit when there's an error occurred.
6. [friend](https://github.com/wechaty/wechaty/wiki/API#6-event-friend) Emit when got a new friend request, or friendship is confirmed.
7. [room-join](https://github.com/wechaty/wechaty/wiki/API#7-event-room-join) Emit when someone join the room
8. [room-leave](https://github.com/wechaty/wechaty/wiki/API#8-event-room-leave) Emit when someone leave the room
9. [room-topic](https://github.com/wechaty/wechaty/wiki/API#9-event-room-topic) Emit when someone change the room's topic

## [Wechaty](https://github.com/wechaty/wechaty/wiki/API#wechaty-class)

1. [instance(setting: PuppetSetting): Promise&lt;Wechaty&gt;](https://github.com/wechaty/wechaty/wiki/API#wechatyinstanceprofilestring-wechaty) create a bot instance
2. [init(): Promise&lt;void&gt;](https://github.com/wechaty/wechaty/wiki/API#wechatyinit-wechaty) Initialize the bot, return Promise.
3. [send(message: Message): Promise&lt;void&gt;](https://github.com/wechaty/wechaty/wiki/API#wechatysendmessage-message-wechaty) send a message
4. [say(content: string): Promise&lt;void&gt;](https://github.com/wechaty/wechaty/wiki/API#wechatysaycontent-string) send message to filehelper, just for logging/reporting usage for your convenience

## [Message](https://github.com/wechaty/wechaty/wiki/API#message-class)

1. [from():Contact](https://github.com/wechaty/wechaty/wiki/API#1-messagefrom-contact) get the sender from a message
2. [from(contact:Contact):void](https://github.com/wechaty/wechaty/wiki/API#2-messagefromcontact-contact-void) set a sender to the message
3. [from(contactId:string):void](https://github.com/wechaty/wechaty/wiki/API#3-messagefromcontactid-string-void) set a sender to the message by contact id
4. [to():Contact](https://github.com/wechaty/wechaty/wiki/API#1-messageto-contact) get the destination of the message
5. [to(contact:Contact):void](https://github.com/wechaty/wechaty/wiki/API#2-messagetocontact-contact-void) set the destination as contact for the message
6. [to(contact:string):void](https://github.com/wechaty/wechaty/wiki/API#3-messagetocontact-string-void) set the destination as contact by 'weixin', for the message
7. [content():string](https://github.com/wechaty/wechaty/wiki/API#1-messagecontent-string) get the content of the message
8. [content(content:string):string](https://github.com/wechaty/wechaty/wiki/API#2-messagecontentcontent-string-string) set the content for the message
9. [room():Room|null](https://github.com/wechaty/wechaty/wiki/API#1-messageroom-room--null) get the room from a message.
10. [room(room:Room):void](https://github.com/wechaty/wechaty/wiki/API#2-messageroomroom-room-void) set the room for a message.
11. [room(roomId:string):void](https://github.com/wechaty/wechaty/wiki/API#3-messageroomroomid-string-void) set the room by id for a Message
12. [type():number](https://github.com/wechaty/wechaty/wiki/API#messagetype-number) get the type of a Message.
13. [say(content:string):Promise](https://github.com/wechaty/wechaty/wiki/API#messagesaycontent-string-promise) reply a message to the sender.
14. [ready():Promise](https://github.com/wechaty/wechaty/wiki/API#messageready-promise) confirm get all the data needed, will be resolved when all message data is ready.
15. [self(message:Message):boolean](https://github.com/wechaty/wechaty/wiki/API#messageselfmessage-message-boolean) check if a message is sent by self 

## [Contact](https://github.com/wechaty/wechaty/wiki/API#contact-class)

1. [id:string](https://github.com/wechaty/wechaty/wiki/API#contactid-string) get uniq id from a contact
2. [name():string](https://github.com/wechaty/wechaty/wiki/API#contactname-string) get name from a contact
3. [remark():string](https://github.com/wechaty/wechaty/wiki/API#contactremark-string) get remark name from a contact
4. [remark(remark:string):Promise](https://github.com/wechaty/wechaty/wiki/API#contactremarkremark-string-promise) set remark name to a contact
5. [weixin():string](https://github.com/wechaty/wechaty/wiki/API#contactweixin-string) get weixin number from a contact
6. [star():boolean](https://github.com/wechaty/wechaty/wiki/API#contactstar-boolean) true for star friend, false for no star friend
7. [ready():Promise](https://github.com/wechaty/wechaty/wiki/API#contactready-promise) confirm get all the contact data needed, will be resolved when all data is ready
8. [say(content:string):Promise](https://github.com/wechaty/wechaty/wiki/API#contactsaycontent-string-promise) say content to a contact

## [Room](https://github.com/wechaty/wechaty/wiki/API#class-room)

1. [say(content:string,replyTo:Contact|ContactArray):Promise](https://github.com/wechaty/wechaty/wiki/API#roomsaycontent-string-replyto-contactcontact-promise) say content inside Room.
2. [ready():Promise](https://github.com/wechaty/wechaty/wiki/API#roomready-promise) confirm get all the data needed, will be resolved when all data is ready
3. [refresh():Promise](https://github.com/wechaty/wechaty/wiki/API#roomrefresh-promise) force reload data for Room

### [Room Event](https://github.com/wechaty/wechaty/wiki/API#room-events)

1. [join](https://github.com/wechaty/wechaty/wiki/API#event-join) Emit when someone join the room
2. [leave](https://github.com/wechaty/wechaty/wiki/API#event-leave) Emit when someone leave the room
3. [topic](https://github.com/wechaty/wechaty/wiki/API#event-topic) Emit when someone change the room topic

## [FriendRequest](https://github.com/wechaty/wechaty/wiki/API#class-friendrequest)

1. [hello:string](https://github.com/wechaty/wechaty/wiki/API#friendrequesthello-string) get content from friendrequest
2. [accept():void](https://github.com/wechaty/wechaty/wiki/API#friendrequestaccept-void) accept a friendrequest
3. [send(contact:Contact,hello:string):void](https://github.com/wechaty/wechaty/wiki/API#friendrequestsendcontact-contact-hello-string-void) send a new friend request

# Test

[![Linux/Mac Build Status](https://img.shields.io/travis/wechaty/wechaty.svg?label=Linux/Mac)](https://travis-ci.org/wechaty/wechaty) [![Windows Build status](https://img.shields.io/appveyor/ci/zixia/wechaty/master.svg?label=Windows)](https://ci.appveyor.com/project/zixia/wechaty) [![Docker CircleCI](https://img.shields.io/circleci/project/github/wechaty/wechaty.svg?label=Docker)](https://circleci.com/gh/wechaty/wechaty) [![Coverage Status](https://coveralls.io/repos/github/wechaty/wechaty/badge.svg?branch=master)](https://coveralls.io/github/wechaty/wechaty?branch=master) [![Known Vulnerabilities](https://snyk.io/test/github/wechaty/wechaty/badge.svg)](https://snyk.io/test/github/wechaty/wechaty)

Wechaty use [AVA](https://github.com/avajs/ava) for unit testing

To test Wechaty, run:
```shell
npm test
```

Get to know more about test from [Wiki:Test](https://github.com/wechaty/wechaty/wiki/Test)

# Release Notes

* [Latest Release](https://github.com/wechaty/wechaty/releases/latest)(All releases [here](https://github.com/wechaty/wechaty/releases))
* [Changelog](https://github.com/wechaty/wechaty/blob/master/CHANGELOG.md)

# Powered By Wechaty

[![Powered by Wechaty](https://img.shields.io/badge/Powered%20By-Wechaty-green.svg)](https://github.com/wechaty/wechaty)

## Wechaty Badge

Get embed html/markdown code from [Wiki:PoweredByWechaty](https://github.com/wechaty/wechaty/wiki/PoweredByWechaty)

## Projects Use Wechaty

1. [Wechaty.io](https://www.wechaty.io) ChatBot Portal Manager for Wechaty 

Know more about Projects Use Wechaty at [Wiki:PoweredByWechaty](https://github.com/wechaty/wechaty/wiki/PoweredByWechaty)

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
