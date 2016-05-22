![Wechaty](https://raw.githubusercontent.com/zixia/wechaty/master/images/wechaty-logo-en.png)
# Wechaty [![Circle CI](https://circleci.com/gh/zixia/wechaty.svg?style=svg)](https://circleci.com/gh/zixia/wechaty) [![Build Status](https://travis-ci.org/zixia/wechaty.svg?branch=master)](https://travis-ci.org/zixia/wechaty)
Wechaty is a Bot-Enable Framework/Library for Personal Account of Wechat.

> Easy creating personal account wechat robot code in 10 lines.

**Connecting Bots**

[![Join the chat at https://gitter.im/zixia/wechaty](https://badges.gitter.im/zixia/wechaty.svg)](https://gitter.im/zixia/wechaty?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![node](https://img.shields.io/node/v/wechaty.svg?maxAge=2592000)](https://nodejs.org/)
[![Repo Size](https://reposs.herokuapp.com/?path=zixia/wechaty)]()
[![Coverage Status](https://coveralls.io/repos/github/zixia/wechaty/badge.svg?branch=master)](https://coveralls.io/github/zixia/wechaty?branch=master)
[![npm version](https://badge.fury.io/js/wechaty.svg)](https://badge.fury.io/js/wechaty)
[![Downloads][downloads-image]][downloads-url]

# Why
My daily life/work depends on too much chat on wechat.
* I almost have 14,000 wechat friends till May 2014, before wechat restricts a total number of friends to 5,000.
* I almost have 400 wechat groups that most of them have more than 400 members.

Can you image that? I'm dying...

So a tireless bot working for me 24x7 on wechat, moniting/filtering the most important message is badly needed. For example: highlights discusstion which contains the KEYWORDS I want to follow up(especially in a noisy group). ;-)

# Examples
Wechaty is super easy to use: 10 lines of javascript is enough for your first wechat robot.

## 1. Basic: 10 lines
The following 10 lines of code will implement a bot that will reply a message automatically to you:

```javascript
const Wechaty = require('wechaty')
const bot = new Wechaty()

bot.init()
.then(bot.getLoginQrImgUrl.bind(bot.puppet))
.then(url => console.log(`Scan qrcode in url to login: \n${url}`))

bot.on('message', m => {
  console.log('RECV: ' + m.get('content'))  // 1. print received message

  const reply = new Wechaty.Message()       // 2. create reply message
  .set('to', m.get('from'))                 //    1) set receipt
  .set('content', 'roger.')                 //    2) set content

  bot.send(reply)                           // 3. do reply!
  .then(() => console.log('REPLY: roger.')) // 4. print reply message
})
```

Notice that you need to wait a moment while bot trys to get the login QRCode from Wechat. As soon as the bot gets login QRCode url, he will print url out. You need to scan the qrcode on wechat, and confirm login.

After that, bot will be on duty. (roger-bot source can be found at [here](https://github.com/zixia/wechaty/blob/master/example/roger-bot.js))

## 2. Advanced: 50 lines
There's another basic usage demo bot named [ding-dong-bot](https://github.com/zixia/wechaty/blob/master/example/ding-dong-bot.js), who can reply _dong_ when bot receives a message _ding_.

## 3. Hardcore: 100 lines
To Be Written.

Plan to glue with Machine Learning/Deep Learning/Neural Network/Natural Language Processing.

# Installation & Usage
Use NPM is recommended to install Wechaty for you:
```shell
npm install --save wechaty
```

## Start from strach
In case that you do not know anything about nodejs, the follow instructions would help you to run Wechaty bot on your machine.

## 1. Install NodeJS
NodeJS Version 6.0 & above is required.

1. Visit [NodeJS](https://nodejs.org)
1. Download NodeJS Installer(i.e. "v6.2.0 Current")
1. Run Installer to install NodeJS to your machine

## 2. Checkout Wechaty
Use `git` to checkout Wechaty source code from [Github.com](https://github.com)
```shell
git clone https://github.com/zixia/wechaty.git
```

## 3. Install Dependents
```shell
cd wechaty
npm install
```

## 4. Run Demo Bot
```shell
npm start
```
This will run `node example/ding-dong-bot.js`

# Trouble Shooting
If wechaty is not run as expected, run unit test maybe help to find some useful message.
```shell
npm test
```

# Requirement

ECMAScript2015(ES6). I develop and test wechaty with Node.js v6.0.

# API Refference

## Class Wechaty
Main bot class.

```javascript
const bot = new Wechaty()
```

### Wechaty.init()
Initialize the bot, return Promise.
```javascript
bot.init()
.then(() => {
  // do other staff with bot here
}
```

### Wechaty.getLoginQrImgUrl()
Get the login QrCode image url. Must be called after init().  

Return a Promise, for url link.

```javascript
bot.getLoginQrImgUrl()
.then(url => {
  // show url
})
```
### Event: `message`
Emit when there's a new message.
```javascript
bot.on('message', callback)
```
Callback will get an instance of Message Class. (see `Class Message`)

### Event: `login` & `logout`

1. After the bot login full successful, the event `login` will be emitted.
1. After the bot logout, the event `logout` will be emitted.

## Class Message
All messages will be encaped in Message.

### Message.ready()
A message may be not fully initialized yet. Call `ready()` to confirm we get all the data needed.

Return a Promise, will be resolved when all data is ready.

```javascript
message.ready()
.then(() => {
  // Here we can be sure all the data is ready for use.
})
```
### Message.get(prop)
Get prop from a message.

Supported prop list:

1. `id` :String
1. `from` :Contact
1. `to` :Contact
1. `content` :String
1. `group` :Group
1. `date` :Date

```javascript
message.get('content')
```

### Message.set(prop, value)
Set prop to value for a message.

Supported prop list: the same as `get(prop)`

```javascript
message.set('content', 'Hello, World!')
```
## Class Contact

### Contact.ready()
A Contact may be not fully initialized yet. Call `ready()` to confirm we get all the data needed.

Return a Promise, will be resolved when all data is ready.

```javascript
contact.ready()
.then(() => {
  // Here we can be sure all the data is ready for use.
})
```
### Contact.get(prop)
Get prop from a contact.

Supported prop list:

1. `id` :String
1. `weixin` :String
1. `name` :String
1. `remark` :String
1. `sex` :Number
1. `province` :String
1. `city` :String
1. `signature` :String

```javascript
contact.get('name')
```

## Class Group

### Group.ready()
A group may be not fully initialized yet. Call `ready()` to confirm we get all the data needed.

Return a Promise, will be resolved when all data is ready.

```javascript
group.ready()
.then(() => {
  // Here we can be sure all the data is ready for use.
})
```

### Group.get(prop)
Get prop from a group.

Supported prop list:

1. `id` :String
1. `name` :String
1. `members` :Array
    1. `contact` :Contact
    1. `name` :String

```javascript
group.get('members').length
```

# Test
Wechaty use [TAP protocol](http://testanything.org/) to test itself by [tape](https://github.com/substack/tape).

To test Wechaty, run:
```bash
$ npm test
```

Know more about tape: [Why I use Tape Instead of Mocha & So Should You](https://medium.com/javascript-scene/why-i-use-tape-instead-of-mocha-so-should-you-6aa105d8eaf4#.qxrrf2938)

# Version History

## v0.0.5 (2016/5/11)
1. Receive & send message
1. Show contacts info
1. Show groups info
1. 1st usable version
1. Start coding from May 1st 2016

# Todo List
1. Deal with friend request
1. Manage contacts(send friend request/delete contact etc.)

Everybody is welcome to issue your needs.

# Known Issues & Support
Github Issue - https://github.com/zixia/wechaty/issues

# Contributing
* Lint: eslint

    ```bash
    $ npm lint
    ```
* Create an issue, fork, then send a pull request(with unit test please).

# See Also

## Javascript
1. [Weixinbot](https://github.com/feit/Weixinbot) Nodejs 封装网页版微信的接口，可编程控制微信消息

## Python
1. [WeixinBot](https://github.com/Urinx/WeixinBot) *Very well documented* 网页版微信API，包含终端版微信及微信机器人
1. [wxBot](https://github.com/liuwons/wxBot): Wechat Bot API
1. [ItChat](https://github.com/littlecodersh/ItChat): 微信个人号接口（支持文件、图片上下载）、微信机器人及命令行微信。三十行即可自定义个人号机器人

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
