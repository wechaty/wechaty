![Wechaty](https://raw.githubusercontent.com/zixia/wechaty/master/image/wechaty-logo-en.png)
# Wechaty [![Linux Circle CI](https://circleci.com/gh/zixia/wechaty.svg?style=svg)](https://circleci.com/gh/zixia/wechaty) [![Linux Build Status](https://travis-ci.org/zixia/wechaty.svg?branch=master)](https://travis-ci.org/zixia/wechaty) [![Win32 Build status](https://ci.appveyor.com/api/projects/status/60fgkemki7e6upb9?svg=true)](https://ci.appveyor.com/project/zixia/wechaty)

Connecting ChatBots.

Wechaty is a Bot Framework for Wechat **Personal** Account.

> Easy creating personal account wechat robot in 9 lines of code.

Supports [linux](https://travis-ci.org/zixia/wechaty), [win32](https://ci.appveyor.com/project/zixia/wechaty) and darwin(OSX/Mac).

[![Join the chat at https://gitter.im/zixia/wechaty](https://badges.gitter.im/zixia/wechaty.svg)](https://gitter.im/zixia/wechaty?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![node](https://img.shields.io/node/v/wechaty.svg?maxAge=2592000)](https://nodejs.org/)
[![Repo Size](https://reposs.herokuapp.com/?path=zixia/wechaty)]()
[![Coverage Status](https://coveralls.io/repos/github/zixia/wechaty/badge.svg?branch=master)](https://coveralls.io/github/zixia/wechaty?branch=master)
[![npm version](https://badge.fury.io/js/wechaty.svg)](https://badge.fury.io/js/wechaty)
[![Downloads][downloads-image]][downloads-url]

# Examples
Wechaty is super easy to use: 9 lines of javascript is enough for your 1st wechat bot.

## 1. Basic: 9 lines
The following 9 lines of code implement a bot who reply "roger" for every message received:

```javascript
const Wechaty = require('wechaty')
const wechaty = new Wechaty()
wechaty.on('scan', ({url, code}) => {
  console.log(`Use Wechat to scan qrcode in url to login: ${code}\n${url}`)
}).on('message', m => {
  !m.self() && wechaty.reply(m, 'roger') // 1. reply
  .then(() => console.log(`RECV: ${m}, REPLY: "roger"`)) // 2. log message
  .catch(e => console.error(e)) // 3. catch exception
}).init()
```

Notice that you need to wait a moment while bot trys to get the login QRCode from Wechat. As soon as the bot gets login QRCode url, he will print url out. You need to scan the qrcode on wechat, and confirm login.

After that, bot will be on duty. (roger-bot source can be found at [here](https://github.com/zixia/wechaty/blob/master/example/roger-bot.js))

## 2. Advanced: dozens of lines
Here's an chatbot [ding-dong-bot](https://github.com/zixia/wechaty/blob/master/example/ding-dong-bot.js) who can reply _dong_ when receives a message _ding_.

## 3. Hardcore: hundreds of lines
Here's a chatbot [api-ai-bot](https://github.com/zixia/wechaty/blob/master/example/api-ai-bot.js), who can slightly understand NLP.

Natual Language Understanding enabled by [api.AI](https://api.ai), you can get your module on api.AI by it's free plan.

# Installation

## Install from NPM
Use NPM is recommended to install a stable version of Wechaty published on NPM.com
```shell
npm install --save wechaty
```

Then you are set.

## Install to Cloud9 IDE
[Cloud9 IDE](https://c9.io/) is Google Docs for Code, which is my favourite IDE today. Almost all my wechaty development is based on Cloud9.

> Cloud9 IDE written in JavaScript, uses Node.js on the back-end. It uses Docker containers for its workspaces, and hosted on Google Compute Engine.

### 1. Open in Cloud9 IDE

Just one click here: <a href="https://c9.io/open/?name=Wechaty&type=nodejs&clone_url=https://github.com/zixia/wechaty.git&description=Wechat%20for%20Bot&selection_file=/example/ding-dong-bot.js" target="_blank"><img src="https://img.shields.io/badge/open%20in-Cloud9%20IDE-blue.svg" alt="Open Wechaty in Cloud9 IDE"></a>

### 2. Set default to Node.js v6
Open Terminal in Cloud9 IDE, use nvm to install nodejs v6, which is required by Wechaty.

```bash
$ nvm install 6
Downloading https://nodejs.org/dist/v6.2.1/node-v6.2.1-linux-x64.tar.xz...
######################################################################## 100.0%
Now using node v6.2.1 (npm v3.9.3)

$ nvm alias default 6
default -> 6 (-> v6.2.1)

$ node --version
v6.2.1
```

### 3. Run
```bash
$ npm install

$ node example/ding-dong-bot.js
```

### 4. Enjoy Cloud9 IDE
You are set.

## Install from Github
In case that you want to dive deeper into Wechaty, fork & clone to run Wechaty bot on your machine, and start hacking.

### 1. Install Node.js
Node.js Version 6.0 or above is required.

1. Visit [Node.js](https://nodejs.org)
1. Download NodeJS Installer(i.e. "v6.2.0 Current")
1. Run Installer to install NodeJS to your machine

### 2. Fork & Clone Wechaty

If you have no github account, you can just clone it via https:
```shell
git clone https://github.com/zixia/wechaty.git
```
This will clone wechaty source code to your current directory.

### 3. Run Demo Bot
```shell
cd wechaty
npm install
node example/ding-dong-bot.js
```

After a little while, bot will show you a message of a url for Login QrCode. You need to scan this qrcode in your wechat in order to permit your bot login.

### 4. Done

Enjoy hacking Wechaty!
Please submit your issue if you have any, and a fork & pull is very welcome for showing your idea.

# Trouble Shooting
If wechaty is not run as expected, run unit test maybe help to find some useful message.
```shell
npm test
```

## DEBUG output
Wechaty use [npmlog](https://www.npmjs.com/package/npmlog) to output debug message. You can set log level by environment variable `WECHATY_DEBUG` to show debug message.

environment variable `WECHATY_DEBUG` values:

1. `silly`
1. `verbose`
1. `info`
1. `warn`
1. `error`

Linux/Darwin(OSX/Mac):

```bash
$ export WECHATY_DEBUG=verbose
```

Win32:

```shell
set WECHATY_DEBUG=verbose
```

Tips: You may want to have more scroll buffer size in your CMD window in windows.
```shell
mode con lines=32766
```
> http://stackoverflow.com/a/8775884/1123955

### NpmLog with Timestamp ###
Here's a quick and dirty patch, to npmlog/log.js

```javascript
  m.message.split(/\r?\n/).forEach(function (line) {

    var date = new Date();
    var min = date.getMinutes()
    var sec = date.getSeconds()
    var hour = date.getHours()

    if (sec < 10) { sec = '0' + sec }
    if (min < 10) { min = '0' + min }
    if (hour < 10) { hour = '0' + hour }

    this.write(hour + ':' + min + ':' + sec + ' ')

    if (this.heading) {
      this.write(this.heading, this.headingStyle)
      this.write(' ')
    }
```

And we can looking forward the official support from npmlog: https://github.com/npm/npmlog/pull/24

# Requirement

ECMAScript2015(ES6). I develop and test wechaty with Node.js v6.0.

# API Refference

I'll try my best to keep the api as sample as it can be.

## Events

Wechaty support the following 5 events:

1. scan
2. login
3. logout
4. message
5. error

### 1. Event: `scan`

A `scan` event will be emitted when the bot need to show you a QrCode for scaning.

```javascript
wechaty.on('scan', ({code, url}) => {
  console.log(`[${code}] Scan ${url} to login.` )
})
```

1. url: {String} the qrcode image url
2. code: {Number} the scan status code. some known status of the code list here is:
    1. 0    initial
    1. 200  login confirmed
    1. 201  scaned, wait for confirm
    1. 408  wait for scan

`scan` event will be emit when it will detect a new code status change.

### 2. Event: `login`

After the bot login full successful, the event `login` will be emitted, with a [Contact](#class-contact) of current logined user.
```javascript
wechaty.on('login', user => {
  console.log(`user ${user} logined`)
})
```
### 3. Event: `logout`
`logout` will be emitted when bot detected it is logout.

### 4. Event: `message`
Emit when there's a new message.
```javascript
wechaty.on('message', message => {
  console.log('message ${message} received')
})
```
The `message` here is a [Message](#class-message).

### 5. Event: `error`
To be support.

## Class Wechaty
Main bot class.

```javascript
const wechaty = new Wechaty(options)
```

options:

1. `session`(OPTIONAL): session name. if a session name is provided, the login status will be saved to it, and automatically restored on next time of wechaty start(restart).
    * can be set by environment variable: `WECHATY_SESSION`
1. `head`(OPTIONAL): specify the browser name for webdriver.
    * can be set by environment variable: `WECHATY_HEAD`
    * values:
        * `phantomjs`: it's the default behaviour if head is not set.
        * `chrome`

### Wechaty.init()
Initialize the bot, return Promise.

```javascript
wechaty.init()
.then(() => {
  // do other staff with bot here
}
```

### Wechaty.reply(message: Message, reply: String)
Reply a `message` with `reply`.

That means: the `to` field of the reply message is the `from` of origin message.

```javascript
wechaty.reply(message, 'roger')
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
1. `room` :Room
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

### Message.self()
Check if message is send by self.

Return `true` for send from self, `false` for send from others.

```javascript
if (m.self()) {
  console.log('this message is sent by myself!')
}
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

## Class Room


### Room.get(prop)
Get prop from a room.

Supported prop list:

1. `id` :String
1. `name` :String
1. `members` :Array
    1. `contact` :Contact
    1. `name` :String

```javascript
room.get('members').length
```
### Room.ready()
A room may be not fully initialized yet. Call `ready()` to confirm we get all the data needed.

Return a Promise, will be resolved when all data is ready.

```javascript
room.ready()
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

## v0.1.7 (master)
1. add a watchdog to restore from unknown state
2. add support to download image message by `ImageMessage.readyStream()`
3. fix lots of stable issues with webdriver exceptions & injection js code compatible

## v0.1.1 (2016/6/10)
1. add support to save & restore wechat login session
1. add continious integration tests on win32 platform. (powered by [AppVeyor](https://www.appveyor.com/))
1. add environment variables HEAD/PORT/SESSION/DEBUG to config Wechaty

## v0.0.10 (2016/5/28)
1. use event `scan` to show login qrcode image url(and detect state change)
2. new examples: Tuling123 bot & api.AI bot
3. more unit tests
4. code coverage status

## v0.0.5 (2016/5/11)
1. Receive & send message
1. Show contacts info
1. Show rooms info
1. 1st usable version
1. Start coding from May 1st 2016

# Todo List

- [ ] Contact
    - [ ] Accept a friend request
    - [ ] Send a friend request
    - [ ] Delete a contact
- [ ] Chat Room
    - [ ] Create a new chat room
    - [ ] Invite people to join a existing chat room
    - [ ] Rename a Chat Room
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
- [x] Session save/load

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

## Similar Project

### Javascript
1. [Weixinbot](https://github.com/feit/Weixinbot) Nodejs 封装网页版微信的接口，可编程控制微信消息

### Perl
1. [MojoWeixin](https://github.com/sjdy521/Mojo-Weixin) 使用Perl语言编写的微信客户端框架，基于Mojolicious，要求Perl版本5.10+，可通过插件提供基于HTTP协议的api接口供其他语言或系统调用

### Python
1. [WeixinBot](https://github.com/Urinx/WeixinBot) *Very well documented* 网页版微信API，包含终端版微信及微信机器人
1. [wxBot](https://github.com/liuwons/wxBot): Wechat Bot API
1. [ItChat](https://github.com/littlecodersh/ItChat): 微信个人号接口（支持文件、图片上下载）、微信机器人及命令行微信。三十行即可自定义个人号机器人

## Chat Script
1. [SuperScript](http://superscriptjs.com/) A dialog system and bot engine for conversational UI's. (Pure Javascript)
2. [RiveScript](https://www.rivescript.com/) A simple scripting language for giving intelligence to chatbots and other conversational entities. (Perl original, Multi-Language support)

## Application
1. [助手管家](http://72c.me/a/m/yhmhrh) It's a Official Account of wechat, which can manage your personal wechat account as a robot assistant.

## Service
1. [Luis.ai](https://www.luis.ai) Language Understanding Intelligent Service (LUIS) offers a fast and effective way of adding language understanding to applications from Microsoft
1. [API.ai](https://api.ai) Build conversational user interfaces
1. [Wit.ai](https://wit.ai) Turn user input into action from Facebook
1. [Watson](http://www.ibm.com/smarterplanet/us/en/ibmwatson/developercloud/doc/dialog/) a comprehensive, robust, platform for managing conversations between virtual agents and users through an application programming interface (API) from IBM

* [Advanced Natural Language Processing Tools for Bot Makers](https://stanfy.com/blog/advanced-natural-language-processing-tools-for-bot-makers/) a good article of comparing the above services.

## Framework
1. [Bot Framework](https://dev.botframework.com/) Build and connect intelligent bots to interact with your users naturally wherever they are, from text/sms to Skype, Slack, Office 365 mail and other popular services. from Microsoft

My Story
----------------
My daily life/work depends on too much chat on wechat.
* I almost have 14,000 wechat friends till May 2014, before wechat restricts a total number of friends to 5,000.
* I almost have 400 wechat rooms that most of them have more than 400 members.

Can you image that? I'm dying...

So a tireless bot working for me 24x7 on wechat, moniting/filtering the most important message is badly needed. For example: highlights discusstion which contains the KEYWORDS I want to follow up(especially in a noisy room). ;-)

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
