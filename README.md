![Wechaty](https://raw.githubusercontent.com/zixia/wechaty/master/image/wechaty-logo-en.png)
# Wechaty [![Circle CI](https://circleci.com/gh/zixia/wechaty.svg?style=svg)](https://circleci.com/gh/zixia/wechaty) [![Build Status](https://travis-ci.org/zixia/wechaty.svg?branch=master)](https://travis-ci.org/zixia/wechaty)
Wechaty is a Chatbot Library for Wechat **Personal** Account.

> Easy creating personal account wechat robot in 10 lines of code.

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
The following 10 lines of code implement a bot who reply "roger" for every message received:

```javascript
const Wechaty = require('wechaty')
const bot = new Wechaty()

bot.init()
.on('scan', ({url, code}) => {
  console.log(`Scan qrcode in url to login: ${code}\n${url}`)
})
.on('message', m => {
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

# Installation

# Install from NPM
Use NPM is recommended to install a stable version of Wechaty published on NPM.com
```shell
npm install --save wechaty
```

Then you are set.

# Install from Github(for hack)
In case that you want to dive deeper into Wechaty, fork & clone to run Wechaty bot on your machine, and start hacking.

## 1. Install Node.js
Node.js Version 6.0 or above is required.

1. Visit [Node.js](https://nodejs.org)
1. Download NodeJS Installer(i.e. "v6.2.0 Current")
1. Run Installer to install NodeJS to your machine

## 2. Fork & Clone Wechaty

If you have no github account, you can just clone it via https:
```shell
git clone https://github.com/zixia/wechaty.git
```
This will clone wechaty source code to your current directory.

## 3. Run Demo Bot
```shell
cd wechaty
npm install
npm start
```
This will run `node example/ding-dong-bot.js`

After a little while, bot will show you a message of a url for Login QrCode. You need to scan this qrcode in your wechat in order to permit your bot login.

## 4. Done

Enjoy hacking Wechaty!
Please submit your issue if you have any, and a fork & pull is very welcome for showing your idea.

# Trouble Shooting
If wechaty is not run as expected, run unit test maybe help to find some useful message.
```shell
npm test
```

# Requirement

ECMAScript2015(ES6). I develop and test wechaty with Node.js v6.0.

# API Refference

I'll try my best to keep the api as sample as it can be.

## Events

### 1. Event: `scan`

A `scan` event will be emitted when the bot need to show you a QrCode for scaning.

```javascript
bot.on('scan', ({code, url}) => {
  console.log(`[${code}] Scan ${url} to login.` )
})
```

1. url: {String} the qrcode image url
2. code: {Number} the scan status code. some known status of the code list here is:
    1. 0    initial
    2. 408  wait for scan
    3. 201  scaned, wait for confirm
    4. 200  login confirmed

`scan` event will be emit when it will detect a new code status change.

### 2. Event: `login`

After the bot login full successful, the event `login` will be emitted, with a [Contact](#class-contact) of current logined user.
```javascript
bot.on('login', user => {
  console.log(`user ${user} logined`)
})
```
### 3. Event: `logout`
`logout` will be emitted when bot detected it is logout.

### 4. Event: `message`
Emit when there's a new message.
```javascript
bot.on('message', message => {
  console.log('message ${message} received')
})
```
The `message` here is a [Message](#class-message).

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

## Class Message
All wechat messages will be encaped as a Message.

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

### Message.ready()
A message may be not fully initialized yet. Call `ready()` to confirm we get all the data needed.

Return a Promise, will be resolved when all data is ready.

```javascript
message.ready()
.then(() => {
  // Here we can be sure all the data is ready for use.
})
```

## Class Contact

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

### Contact.ready()
A Contact may be not fully initialized yet. Call `ready()` to confirm we get all the data needed.

Return a Promise, will be resolved when all data is ready.

```javascript
contact.ready()
.then(() => {
  // Here we can be sure all the data is ready for use.
})
```

## Class Group


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
### Group.ready()
A group may be not fully initialized yet. Call `ready()` to confirm we get all the data needed.

Return a Promise, will be resolved when all data is ready.

```javascript
group.ready()
.then(() => {
  // Here we can be sure all the data is ready for use.
})
```

# Test
Wechaty use [TAP protocol](http://testanything.org/) to test itself by [tap](http://www.node-tap.org/).

To test Wechaty, run:
```shell
npm test
```

Know more about TAP: [Why I use Tape Instead of Mocha & So Should You](https://medium.com/javascript-scene/why-i-use-tape-instead-of-mocha-so-should-you-6aa105d8eaf4#.qxrrf2938)

# Version History

## v0.0.10 (2016/5/28)
1. use event `scan` to show login qrcode image url(and detect state change)
2. new examples: Tuling123 bot & api.AI bot
3. more unit tests
4. code coverage status

## v0.0.5 (2016/5/11)
1. Receive & send message
1. Show contacts info
1. Show groups info
1. 1st usable version
1. Start coding from May 1st 2016

# Todo List

- [ ] Contact
    - [ ] Accept a friend request
    - [ ] Send a friend request
    - [ ] Delete a contact
- [ ] Chat Group
    - [ ] Create a new chat group
    - [ ] Invite people to join a existing chat group
    - [ ] Rename a Chat Group
- [ ] Events
    - [ ] Use EventEmitter2 to emit message events, so we can use wildcard
        1. `message`
        2. `message.recv`
        3. `message.sent`
        4. `message.recv.image`
        5. `message.sent.image`
        6. `message.recv.sys`
        1. `message.**.image`
        1. `message.recv.*`
- [ ] Message
    - [ ] Send/Reply image message
- [ ] Session save/load
    
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

## Other Library

### Javascript
1. [Weixinbot](https://github.com/feit/Weixinbot) Nodejs 封装网页版微信的接口，可编程控制微信消息

### Python
1. [WeixinBot](https://github.com/Urinx/WeixinBot) *Very well documented* 网页版微信API，包含终端版微信及微信机器人
1. [wxBot](https://github.com/liuwons/wxBot): Wechat Bot API
1. [ItChat](https://github.com/littlecodersh/ItChat): 微信个人号接口（支持文件、图片上下载）、微信机器人及命令行微信。三十行即可自定义个人号机器人

## Chatbot Script
1. [SuperScript](http://superscriptjs.com/) A dialog system and bot engine for conversational UI's. (Pure Javascript)
2. [RiveScript](https://www.rivescript.com/) A simple scripting language for giving intelligence to chatbots and other conversational entities. (Perl original, Multi-Language support)


## Application
1. [助手管家](http://72c.me/a/m/yhmhrh) It's a Official Account of wechat, which can manage your personal wechat account as a robot assistant.

## Service
1. [Advanced Natural Language Processing Tools for Bot Makers](https://stanfy.com/blog/advanced-natural-language-processing-tools-for-bot-makers/)
    1. [Luis.ai](https://www.luis.ai) Language Understanding Intelligent Service (LUIS) offers a fast and effective way of adding language understanding to applications from Microsoft
    1. [API.ai](https://api.ai) Build conversational user interfaces
    1. [Wit.ai](https://wit.ai) Turn user input into action from Facebook
    1. [Watson](http://www.ibm.com/smarterplanet/us/en/ibmwatson/developercloud/doc/dialog/) a comprehensive, robust, platform for managing conversations between virtual agents and users through an application programming interface (API) from IBM

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
