[![Wechaty](https://raw.githubusercontent.com/wechaty/wechaty/master/image/wechaty-logo-en.png)](https://github.com/wechaty/wechaty)
# Wechaty [![Linux Circle CI](https://circleci.com/gh/wechaty/wechaty.svg?style=svg)](https://circleci.com/gh/wechaty/wechaty) [![Linux/Mac Build Status](https://img.shields.io/travis/wechaty/wechaty.svg?label=Linux/Mac)](https://travis-ci.org/wechaty/wechaty) [![Win32 Build status](https://img.shields.io/appveyor/ci/zixia/wechaty/master.svg?label=Windows)](https://ci.appveyor.com/project/zixia/wechaty) [![Coverage Status](https://coveralls.io/repos/github/wechaty/wechaty/badge.svg?branch=master)](https://coveralls.io/github/wechaty/wechaty?branch=master)

### Connecting ChatBots.

Wechaty is a Bot Framework for Wechat **Personal** Account that help you easy creating personal wechat bot in 7 lines of javascript code, with cross platform  support to [linux](https://travis-ci.org/wechaty/wechaty), [win32](https://ci.appveyor.com/project/zixia/wechaty) and [darwin(OSX/Mac)](https://travis-ci.org/wechaty/wechaty).

:octocat: <https://github.com/wechaty/wechaty>  
:beetle: <https://github.com/wechaty/wechaty/issues>  
:book: <https://github.com/wechaty/wechaty/wiki>  
:whale: <https://hub.docker.com/r/zixia/wechaty>  

[![Join the chat at https://gitter.im/zixia/wechaty](https://badges.gitter.im/zixia/wechaty.svg)](https://gitter.im/zixia/wechaty?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![node](https://img.shields.io/node/v/wechaty.svg?maxAge=2592000)](https://nodejs.org/)
[![Repo Size](https://reposs.herokuapp.com/?path=wechaty/wechaty)]()

# ATTENTION

## Wechaty was converted to Typescript from Javascript on 12th Oct 2016.

Details: https://github.com/wechaty/wechaty/issues/40

```diff
+ Typescriptilized ...
```

VSCode is recommended for typescript because we can get benifit of [intelligent code completion, parameter info, and member lists](https://code.visualstudio.com/docs/languages/javascript).

The last Javascript version is: [v0.4.0](https://github.com/wechaty/wechaty/releases/tag/v0.4.0) (2016/10/9) , or install v0.4 by `npm install wechaty`.

- See Also: [Why we decided to move from plain JavaScript to TypeScript for Babylon.js](https://www.eternalcoding.com/?p=103)

## Voice of the Developer

> @JasLin : it may be the best wecaht sdk i have seen in github! [link](https://github.com/wechaty/wechaty/issues/8#issuecomment-228971491)

> @Jarvis : 目前用过的最好的微信开发库 [link](http://weibo.com/3296245513/Ec4iNp9Ld?type=comment)

> @ccaapton : wechaty library fantastic! [link](https://github.com/wechaty/wechaty/issues/9)

> @ak5 : Thanks for this it's quite cool! [link](https://github.com/wechaty/wechaty/issues/4)

> @Samurais : wechaty is great. 👍 [link](https://github.com/wechaty/wechaty/issues/36#issuecomment-251708382)

# Examples
Wechaty is dead easy to use: 7 lines javascript for your wechat bot.

## 1. Basic: 6 lines
The following 6 lines of code implement a bot who can log all message to console:

```typescript
import Wechaty from 'wechaty'
Wechaty.instance() // Singleton
.on('scan', (url, code) => console.log(`Scan QrCode to login: ${code}\n${url}`))
.on('login',       user => console.log(`User ${user} logined`))
.on('message',  message => console.log(`Message: ${message}`))
.init()
```

Notice that you need to wait a moment while bot trys to get the login QRCode from Wechat. As soon as the bot gets login QRCode url, he will print url out. You need to scan the qrcode on wechat, and confirm login.

After that, bot will be on duty. (roger-bot source can be found at [here](https://github.com/wechaty/wechaty/blob/master/example/roger-bot.js))

## 2. Advanced: dozens of lines
Here's an chatbot [ding-dong-bot](https://github.com/wechaty/wechaty/blob/master/example/ding-dong-bot.js) who can reply _dong_ when receives a message _ding_.

## 3. Hardcore: hundreds of lines
Here's a chatbot [api-ai-bot](https://github.com/wechaty/wechaty/blob/master/example/api-ai-bot.js), who can slightly understand NLP.

Natual Language Understanding enabled by [api.AI](https://api.ai), you can get your module on api.AI by it's free plan.

# Deploy

Use docker to deploy wechaty is highly recommended.

## Deploy with Docker

[![Docker Pulls](https://img.shields.io/docker/pulls/zixia/wechaty.svg?maxAge=2592000)](https://hub.docker.com/r/zixia/wechaty/)
[![Docker Stars](https://img.shields.io/docker/stars/zixia/wechaty.svg?maxAge=2592000)](https://hub.docker.com/r/zixia/wechaty/)
[![Docker Layers](https://images.microbadger.com/badges/image/zixia/wechaty.svg)](https://microbadger.com/#/images/zixia/wechaty)

[![dockeri.co](http://dockeri.co/image/zixia/wechaty)](https://hub.docker.com/r/zixia/wechaty/)

Wechaty is fully dockerized. So it will be very easy to be deployed as a MicroService. 

```shell
$ export TOKEN="your token here"

$ docker run -e WECHATY_TOKEN="$TOKEN" wechaty/wechaty
```

`WECHATY_TOKEN` is required here, because you need this key to manage wechaty on the chatbot cloud manager: https://www.wechaty.io

### Build

```shell
$ docker build -t wechaty .
```

### Ship

Wechaty can be used via: Container as a Service

* [Arukas Cloud](https://arukas.io/en/) - Hosting Docker Containers(Currently in Beta, provide up to 10 **free containers**)
* [Docker Cloud](https://cloud.docker.com/) - Docker Cloud is a hosted service that provides a Registry with build and testing facilities for Dockerized application images, tools to help you set up and manage your host infrastructure, and deployment features to help you automate deploying your images to your infrastructure.
* [Dao Cloud](https://www.daocloud.io/) - 容器云平台

## Deploy with Heroku

To Be Fix

~~Follow [these instructions](https://wechaty.readme.io/docs). Then, [![Deploy to Heroku](https://www.herokucdn.com/deploy/button.sv
g)](https://heroku.com/deploy)~~


# Installation

## Install from NPM

[![npm version](https://badge.fury.io/js/wechaty.svg)](https://badge.fury.io/js/wechaty)
[![Downloads][downloads-image]][downloads-url]

Use NPM is recommended to install a stable version of Wechaty published on NPM.com
```shell
npm install --save wechaty
```


If you use chrome instead of phantomjs, you should make sure:

1. chrome is installed
1. if you are under linux, set headless right for `Xvfb`

* [Running a GUI application in a Docker container](https://linuxmeerkat.wordpress.com/2014/10/17/running-a-gui-application-in-a-docker-container/)

Then you are set.

## Install to Cloud9 IDE
[Cloud9 IDE](https://c9.io/) is Google Docs for Code, which is my favourite IDE today. Almost all my wechaty development is based on Cloud9.

> Cloud9 IDE written in JavaScript, uses Node.js on the back-end. It uses Docker containers for its workspaces, and hosted on Google Compute Engine.

### 1. Open in Cloud9 IDE

Just one click here: <a href="https://c9.io/open/?name=Wechaty&type=nodejs&clone_url=https://github.com/wechaty/wechaty.git&description=Wechat%20for%20Bot&selection_file=/example/ding-dong-bot.js" target="_blank"><img src="https://img.shields.io/badge/open%20in-Cloud9%20IDE-blue.svg" alt="Open Wechaty in Cloud9 IDE"></a>

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

$ npm run demo
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
git clone https://github.com/wechaty/wechaty.git
```
This will clone wechaty source code to your current directory.

### 3. Run Demo Bot
```shell
cd wechaty
npm install
npm run demo
```

After a little while, bot will show you a message of a url for Login QrCode. You need to scan this qrcode in your wechat in order to permit your bot login.

### 4. Done

Enjoy hacking Wechaty!
Please submit your issue if you have any, and a fork & pull is very welcome for showing your idea.

# Wechaty Badge

[![Powered by Wechaty](https://img.shields.io/badge/Powered%20By-Wechaty-green.svg)](https://github.com/wechaty/wechaty)

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

# Trouble Shooting

If wechaty is not run as expected, run unit test maybe help to find some useful message.

```shell
$ npm test
```

To test with full log messages

```shell
$ WECHATY_LOG=silly npm test
```

[Details about unit testing](https://github.com/wechaty/wechaty/tree/master/test)

## LOG output
Wechaty use [npmlog](https://www.npmjs.com/package/npmlog) to output log message. You can set log level by environment variable `WECHATY_LOG` to show log message.

environment variable `WECHATY_LOG` values:

1. `silly`
1. `verbose`
1. `info`
1. `warn`
1. `error`
1. `silent` for disable logging

Linux/Darwin(OSX/Mac):

```bash
$ export WECHATY_LOG=verbose
```

Win32:

```shell
set WECHATY_LOG=verbose
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

## DEBUG

set environment variable WECHATY_DEBUG to enable DEBUG in Wechaty.

this will:
1. open phantomjs debugger port on 8080

# Requirement

ECMAScript2015(ES6). I develop and test wechaty with Node.js v6.0.

# API Refference

I'll try my best to keep the api as sample as it can be.

## Events

Wechaty support the following 6 events:

1. scan
2. login
3. logout
4. message
5. error
6. friend
7. room-join
8. room-leave
9. room-topic

### this.say(content: string)

`this` is `Sayable` for all listeners.

Notice: when we want to use `this` inside a listener, we must use the traditional `function(this) {}` instead of fat arrow `() => {}` to get `Sayable` `this` inside.

```diff
- wechaty.on('login', user => {               // 1. do not use fat arrow function if you want a `Sayable` `this`
+ wechaty.on('login', function(this, user) {  // 2. use traditional `function(this, ...) {}` instead
  this.say(`${user.name()} logined`)
})
```

which means there will be a `this.say()` method inside listener call, you can use it sending message to `filehelper`, just for logging / reporting / any usage for your convienience

### 1. Event: `scan`

A `scan` event will be emitted when the bot need to show you a QrCode for scaning.

```typescript
wechaty.on('scan', (this: Sayable, url: string, code: number) => {
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
wechaty.on('login', (this: Sayable, user: Contact) => {
  console.log(`user ${user} login`)
})
```

### 3. Event: `logout`

`logout` will be emitted when bot detected it is logout, with a [Contact](#class-contact) of current logined user.

```javascript
wechaty.on('logout', (this: Sayable, user: Contact) => {
  console.log(`user ${user} logout`)
})
```

### 4. Event: `message`

Emit when there's a new message.

```javascript
wechaty.on('message', (this: Sayable, message: Message) => {
  console.log('message ${message} received')
})
```

### 5. Event: `error`

Emit when there's a error occoured.

```javascript
wechaty.on('error', (this: Sayable, err: Error) => {
  console.log('error ${err.message} received')
})
```
The `message` here is a [Message](#class-message).


### 6. Event: `friend`

Fired when we got new friend request, or confirm a friend ship.

```typescript
wechaty.on('friend', (this: Sayable, contact: Contact, request: FriendRequest) => {
  if (request) {  // 1. request to be friend from new contact
    request.accept()
    console.log('auto accepted for ' + contact + ' with message: ' + request.hello)
  } else {        // 2. confirm friend ship
    console.log('new friend ship confirmed with ' + contact))
  }
})
```

### 7. Event: `room-join`

```typescript
wechaty.on('room-join', (this: Sayable, room: Room, invitee: Contact, inviter: Contact) => {
  console.log(`Room ${room} got new member ${invitee}, invited by ${inviter}`)
})
```

### 8. Event: `room-leave`

```typescript
wechaty.on('room-leave', (this: Sayable, room: Room, leaver: Contact) => {
  console.log(`Room ${room} lost member ${leaver}`)
})
```

### 9. Event: `room-topic`

```typescript
wechaty.on('room-topic', (this: Sayable, room: Room, topic: string, oldTopic: string, changer: Contact) => {
  console.log(`Room ${room} topic changed from ${oldTopic} to ${topic} by {changer}`)
})
```

## Wechaty Class
Main bot class.

```javascript
const bot = Wechaty.instance({
  profile
})
```

1. `profile`(OPTIONAL): profile name. if a profile name is provided, the login status will be saved to it, and automatically restored on next time of wechaty start(restart).
    * can be set by environment variable: `WECHATY_PROFILE`
1. ~~`token`(OPTIONAL): wechaty io token. Be used to connect to cloud bot manager.~~

### Wechaty.init(): Wechaty
Initialize the bot, return Promise.

```javascript
wechaty.init()
.then(() => {
  // do other staff with bot here
}
```

### Wechaty.self(): boolean
Check if message is send by self.

Return `true` for send from self, `false` for send from others.

```javascript
if (wechaty.self(message)) {
  console.log('this message is sent by myself!')
}
```

### Wechaty.send(message: Message): Wechaty
send a `message`

```javascript
const msg = new Message()
msg.to('filehelper')
msg.content('hello')

wechaty.send(msg)
```

### @deprecated Wechaty.reply(message: Message, reply: String): Wechaty
Reply a `message` with `reply`.

That means: the `to` field of the reply message is the `from` of origin message.

```javascript
wechaty.reply(message, 'roger')
```

## Message Class

All wechat messages will be encaped as a Message.

`Message` is `Sayable`

### Message.from(contact?: Contact|string): Contact

get the sender from message, or set it.

### Message.to(contact?: Contact|Room|string): Contact|Room

get the receiver from a message, or set it.

### Message.room(room?: Room|string): Room

get the room from a message, or set it.

### Message.say(content: string): Promise<void>

reply a message to the sender.

### Message.ready(): Message
A message may be not fully initialized yet. Call `ready()` to confirm we get all the data needed.

Return a Promise, will be resolved when all data is ready.

```javascript
message.ready()
.then(() => {
  // Here we can be sure all the data is ready for use.
})
```

### @deprecated Message.get(prop): String|Contact|Room|Date

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

### @deprecated Message.set(prop, value): Message
Set prop to value for a message.

Supported prop list: the same as `get(prop)`

```javascript
message.set('content', 'Hello, World!')
```

## Contact Class

`Contact` is `Sayable`

### Contact.name(): string

### Contact.ready(): Contact
A Contact may be not fully initialized yet. Call `ready()` to confirm we get all the data needed.

Return a Promise, will be resolved when all data is ready.

```javascript
contact.ready()
.then(() => {
  // Here we can be sure all the data is ready for use.
})
```

### Contact.say(content: string)

say `content` to Contact

### @deprecated Contact.get(prop): String|Number
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

## Class Room

`Room` is `Sayable`

Doc is cheap, show you code: [Example/Room-Bot](https://github.com/wechaty/wechaty/blob/master/example/room-bot.js)

### Room.say(content: string, replyTo: Contact|Contact[]): Promise<void>

say `content` inside Room.

if you set `replyTo`, then `say()` will mention them as well.
> "@replyTo content"

### Room.ready(): Room
A room may be not fully initialized yet. Call `ready()` to confirm we get all the data needed.

Return a Promise, will be resolved when all data is ready.

```javascript
room.ready()
.then(() => {
  // Here we can be sure all the data is ready for use.
})
```

### Room.refresh(): Room

force reload data for Room

### Room Events

`this` is `Sayable` for all listeners.

which means there will be a `this.say()` method inside listener call, you can use it sending message to `filehelper`, just for logging / reporting / any usage for your convienience

#### Event: `join`

```javascript
Room.on('join', (invitee, inviter) => void)
```

Event `join`: Room New Member

```typescript
room.on('join', (invitee, inviter) => {
  console.log(`user ${invitee} joined the room ${room}, invited by ${inviter}`)
})
```

#### Event: `leave`

```typescript
Room.on('leave', (leaver) => void)
```

#### Event: `topic`

```typescript
Room.on('topic', (topic, oldTopic, changer) => void)
```

### Query Type

```typescript
type Query = { topic: string|Regex }
Room.find(query : Query) : Room | null
Room.findAll(query : Query) : Room[]
```

### static Room.find(query: Query): Promise<Room|null>

### static Room.findAll(query: Query): Promise<Room[]>

### static Room.create(contactList: Contact[], topic?: string): Promise<any>

### Room.add(contact: Contact): Promise<any>

```javascript
const friend = message.get('from')
const room = Room.find({ name: 'Group Name' })
if (room) {
  room.add(friend)
}
```

### Room.del(contact: Contact): void

### Room.topic(newTopic?: string): string

### Room.nick(contact: Contact): string

### Room.has(contact Contact): boolean

### Room.refresh(): Promise<Room>

### Room.owner(): Contact|null

### Room.member(name: string): Contact|null

### Room.memberList(): Contact[]

### @deprecated. Room.get(prop): String|Array[{contact: Contact, name: String}]

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

## Class FriendRequest

Send, receive friend request, and friend confirmation events.

When someone send you a friend request, there will be a Wechaty `friend` event fired.

```typescript
wechaty.on('friend', (contact: Contact, request: FriendRequest) => {
  if (request) {  // 1. request to be friend from new contact
    request.accept()
    console.log('auto accepted for ' + contact + ' with message: ' + request.hello)
  } else {        // 2. confirm friend ship
    console.log('new friend ship confirmed with ' + contact))
  }
})
```

Doc is cheap, read code: [Example/Friend-Bot](https://github.com/wechaty/wechaty/blob/master/example/friend-bot.js)

### FriendRequest.hello: string

verify message

### FriendRequest.accept(): void

accept a friend request

### FriendRequest.send(contact: Contact, hello: string): void

send new friend request

```typescript
const from = message.get('from')
const request = new FriendRequest()
request.send(from, 'hello~')
```

# Test
Wechaty use ~~[TAP protocol](http://testanything.org/)~~ [AVA](https://github.com/avajs/ava) to test itself ~~by [tap](http://www.node-tap.org/)~~.

To test Wechaty, run:
```shell
npm test
```

* Know more about TAP: [Why I use Tape Instead of Mocha & So Should You](https://medium.com/javascript-scene/why-i-use-tape-instead-of-mocha-so-should-you-6aa105d8eaf4)

# Version History

## v0.5.0 master (2016/10) The First Typescript Version
1. [#40](https://github.com/wechaty/wechaty/issues/40) Converted to Typescript (2016/10/11) 
1. [#41](https://github.com/wechaty/wechaty/issues/41) Sayablization: Make Wechaty/Contact/Room `Sayable`, and all `this` inside wechaty event listeners are `Sayable` too.
1. BREAKING CHANGE: global event `scan` listener arguments changed from 1 to 2: now is `function(this: Sayable, url: string, code: number)` instead of `function({url, code})` before. 

## [v0.4.0](https://github.com/wechaty/wechaty/releases/tag/v0.4.0) (2016/10/9) The Latest Javascript Version
1. [#32](https://github.com/wechaty/wechaty/issues/32) Extend Room Class with:
  1. Global events: `room-join`, `room-leave`, `room-topic`
  1. Room events: `join`, `leave`, `topic`
  1. Create a new Room: `Room.create()`
  1. Add/Del/Topic for Room
  1. Other methods like nick/member/has/etc...
1. [#33](https://github.com/wechaty/wechaty/issues/33) New Class `FriendRequest` with:
  1. `Wechaty.on('friend', function(contact: Contact, request: FriendRequest) {})` with Wechaty new Event `friend` 
  1. `request.accept()` to accept a friend request
  1. `requestsend()` to send new friend request

## v0.3.13 (2016/09)
1. Managed by Cloud Manager: https://app.wechaty.io
1. Dockerized & Published to docker hub as: [zixia/wechaty](https://hub.docker.com/r/zixia/wechaty/)
1. Add `reset` & `shutdown` to IO Event
1. Switch Unit Test Runner from Tape/Tap to [AVA](https://github.com/avajs/ava)
1. Move git resposity from zixia/wechaty to [wechaty/wechaty](https://github.com/wechaty/wechaty)

## v0.2.3 (2016/7/28)
1. add wechaty.io cloud management support: set environment variable `WECHATY_TOKEN` to enable io support
2. rename `WECHATY_SESSION` to `WECHATY_PROFILE` for better name
3. fix watchdog timer & reset bug

## v0.1.8 (2016/6/25)
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

- [x] Contact
    - [x] Accept a friend request
    - [x] Send a friend request
    - ~~[ ] Delete a contact~~
- [x] Chat Room
    - [x] Create a new chat room
    - [x] Invite people to join a existing chat room
    - [x] Rename a Chat Room
- [x] Session save/load
- [x] Switch to AVA Test Runner
- [ ] Rewrite to TypeScript
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
    - [ ] Send/Reply image/video/attachment message
    - [ ] Save video message to file
    - [x] Save image message to file

Everybody is welcome to issue your needs.

# Known Issues & Support
Github Issue <https://github.com/wechaty/wechaty/issues>

# Contributing
* Lint: eslint
    ```bash
    $ npm run lint
    ```
* Create an issue, fork, then send a pull request(with unit test please).

# See Also

## Similar Project

### Javascript
1. [Weixinbot](https://github.com/feit/Weixinbot) Nodejs 封装网页版微信的接口，可编程控制微信消息
1. [wechatBot](https://github.com/stonexer/wechatBot) 面向个人的微信 wechat 机器人平台 - 使用微信网页版接口wechat4u
1. [Wechat4U](https://github.com/nodeWechat/wechat4u) 微信 wechat web 网页版接口的 JavaScript 实现，兼容Node和浏览器
2. [wechat-user-bot](https://github.com/HalfdogStudio/wechat-user-bot) 正在组装中的微信机器人
2. [Hubot-WeChat](https://github.com/KasperDeng/Hubot-WeChat) Hubot是一个具有真实微信号的机器人，可以自动回复信息到微信群和某联系人，并能给维护者的微信自动发送Hubot在线状态

### Electron
1. [:speech_balloon: A better WeChat on macOS and Linux. Fewer bugs, more features. Built with Electron by Zhongyi Tong.](https://github.com/geeeeeeeeek/electronic-wechat)
  - [网页版微信抓包+注入实现表情贴纸显示](https://github.com/geeeeeeeeek/electronic-wechat/issues/2)
  - [新表情方案: 收到消息时修改其内容（及阻止撤回）](https://github.com/geeeeeeeeek/electronic-wechat/pull/13)
1. [普通个人号 微信机器人/外挂](https://github.com/fritx/wxbot)
  - [微信个人号/公众号相关项目整理（wechat/weixin/wx）](https://github.com/fritx/awesome-wechat)

### Go
1. [0d0f/exfe](https://github.com/0d0f/exfe-bus/tree/master/src/wechat) Wechat bot component of exfe-bus 

### Perl
1. [MojoWeixin](https://github.com/sjdy521/Mojo-Weixin) 使用Perl语言编写的微信客户端框架，基于Mojolicious，要求Perl版本5.10+，可通过插件提供基于HTTP协议的api接口供其他语言或系统调用

### Python
1. [WeixinBot](https://github.com/Urinx/WeixinBot) *Very well documented* 网页版微信API，包含终端版微信及微信机器人
1. [wxBot](https://github.com/liuwons/wxBot): Wechat Bot API
1. [ItChat](https://github.com/littlecodersh/ItChat): 微信个人号接口（支持文件、图片上下载）、微信机器人及命令行微信。三十行即可自定义个人号机器人
1. [WechatIrcd](https://github.com/MaskRay/wechatircd): 用IRC客户端控制微信网页版
1. [查看被删的微信好友](https://github.com/0x5e/wechat-deleted-friends): 由于微信后台已经对此类脚本做了屏蔽，无论是什么语言版本的脚本均已经失效，此项目帮助了解微信web版通讯过程，切勿再使用！

### KDE
1. [WeChat KDE frontend 微信 KDE 前端](https://github.com/xiangzhai/qwx)

### dotNET
1. [WeChat.NET](https://github.com/sherlockchou86/WeChat.NET) WeChat.NET client based on web wechat

## Chat Script
1. [SuperScript](http://superscriptjs.com/) A dialog system and bot engine for conversational UI's. (Pure Javascript)
2. [RiveScript](https://www.rivescript.com/) A simple scripting language for giving intelligence to chatbots and other conversational entities. (Perl original, Multi-Language support)
3. [CleverScript](https://www.cleverscript.com) Easily create text, voice or avatar bots that people can chat with in browser, app or their preferred messaging platform.

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

