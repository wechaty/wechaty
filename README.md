[![Wechaty](https://raw.githubusercontent.com/wechaty/wechaty/master/image/wechaty-logo-en.png)](https://github.com/wechaty/wechaty)
# Wechaty [![Linux/Mac Build Status](https://img.shields.io/travis/wechaty/wechaty.svg?label=Linux/Mac)](https://travis-ci.org/wechaty/wechaty) [![Win32 Build status](https://img.shields.io/appveyor/ci/zixia/wechaty/master.svg?label=Windows)](https://ci.appveyor.com/project/zixia/wechaty) [![Docker CircleCI](https://img.shields.io/circleci/project/github/wechaty/wechaty.svg?label=Docker)](https://circleci.com/gh/wechaty/wechaty)

## Connecting ChatBots.

Wechaty is a Bot Framework for Wechat **Personal** Account that helps you easy creating bot in 6 lines of javascript, with cross-platform support include [Linux](https://travis-ci.org/wechaty/wechaty), [Win32](https://ci.appveyor.com/project/zixia/wechaty), [Darwin(OSX/Mac)](https://travis-ci.org/wechaty/wechaty) and [Docker](https://circleci.com/gh/wechaty/wechaty).

:octocat: <https://github.com/wechaty/wechaty>  
:beetle: <https://github.com/wechaty/wechaty/issues>  
:book: <https://github.com/wechaty/wechaty/wiki>  
:whale: <https://hub.docker.com/r/zixia/wechaty>  

[![Join the chat at https://gitter.im/zixia/wechaty](https://badges.gitter.im/zixia/wechaty.svg)](https://gitter.im/zixia/wechaty?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![node](https://img.shields.io/node/v/wechaty.svg?maxAge=2592000)](https://nodejs.org/)
[![Repo Size](https://reposs.herokuapp.com/?path=wechaty/wechaty)](https://github.com/wechaty/wechaty)

## Voice of the Developer

> @JasLin: it may be the best wechat SDK I have seen in Github! [link](https://github.com/wechaty/wechaty/issues/8#issuecomment-228971491)

> @ccaapton: wechaty library fantastic! [link](https://github.com/wechaty/wechaty/issues/9)

> @ak5: Thanks for this it's quite cool! [link](https://github.com/wechaty/wechaty/issues/4)

> @Samurais: wechaty is great.  [link](https://github.com/wechaty/wechaty/issues/36#issuecomment-251708382)

> @Jarvis: 目前用过的最好的微信开发库 [link](http://weibo.com/3296245513/Ec4iNp9Ld?type=comment)

> @naishstar: thanks for great SDK [link](https://github.com/wechaty/wechaty/issues/57)

# Examples
Wechaty is dead easy to use: 6 lines javascript for your wechat bot.

## 1. Basic: 6 lines
The following six lines of code implement a bot who can log all message to console:

```typescript
import Wechaty from 'wechaty'

Wechaty.instance() // Singleton
.on('scan', (url, code) => console.log(`Scan QrCode to login: ${code}\n${url}`))
.on('login',       user => console.log(`User ${user} logined`))
.on('message',  message => console.log(`Message: ${message}`))
.init()
```

Notice that you need to wait a moment while bot tries to get the login QRCode from Wechat. As soon as the bot gets login QRCode URL, he will print URL out. You need to scan the QR code on wechat and confirm login.

After that, the bot will be on duty. (roger-bot source can be found at [here](https://github.com/wechaty/wechaty/blob/master/example/roger-bot.ts))

## 2. Advanced: dozens of lines
Here's a chatbot [ding-dong-bot](https://github.com/wechaty/wechaty/blob/master/example/ding-dong-bot.ts) who can reply _dong_ when receives a message _ding_.

## 3. Hardcore: hundreds of lines
Here's a chatbot [api-ai-bot](https://github.com/wechaty/wechaty/blob/master/example/api-ai-bot.ts), who can slightly understand NLP.

Natural Language Understanding enabled by [api.AI](https://api.ai), you can get your module on api.AI by its free plan.

# Deploy

Use Docker to deploy wechaty is highly recommended.

## Deploy with Docker

[![Docker Pulls](https://img.shields.io/docker/pulls/zixia/wechaty.svg?maxAge=2592000)](https://hub.docker.com/r/zixia/wechaty/)
[![Docker Stars](https://img.shields.io/docker/stars/zixia/wechaty.svg?maxAge=2592000)](https://hub.docker.com/r/zixia/wechaty/)
[![Docker Layers](https://images.microbadger.com/badges/image/zixia/wechaty.svg)](https://microbadger.com/#/images/zixia/wechaty)

[![dockeri.co](http://dockeri.co/image/zixia/wechaty)](https://hub.docker.com/r/zixia/wechaty/)

Wechaty is fully dockerized. So it will be very easy to be used as a MicroService. 

### Wechaty Runtime

The best practice of using Wechaty Docker is like the following:

``` bash
$ cat > mybot.ts
import Wechaty from 'wechaty'

const bot = Wechaty.instance()
console.log(bot.version())
^D

$ alias wechaty='docker run \
    -t -i --rm \
    -e WECHATY_LOG="$WECHATY_LOG" \
    --volume="$(pwd)":/bot \
    --name=wechaty \
    zixia/wechaty \
'

$ wechaty mybot.ts
```

see? death easy to use!

#### Docker options explanation

1. `-t` : Allocate a pseudo-TTY
1. `-i` : Keep STDIN open even if not attached
1. `--rm` : Automatically remove the container when it exits
1. `-e WECHATY_LOG="$WECHATY_LOG"` : Pass the environment variable `WECHATY_LOG` into the container
1. `--volume="$(pwd)":/bot` : Bind current directory(replaced by `"$(pwd)"`) to '`/bot`' inside the container, by mounting the volume
1. `--name=wechaty` : Assign `wechaty` as the container name
1. `zixia/wechaty` : Image name on docker hub, here's our [zixia/wechaty](https://hub.docker.com/r/zixia/wechaty)
1. `mybot.ts` : File contains code wrote by you, should be placed in current directory `./`

* Work Log: [Dockerize Wechaty for easy start #66](https://github.com/wechaty/wechaty/issues/66)

### Wechaty Hostie

```bash
export TOKEN="your token here"

docker run -e WECHATY_TOKEN="$TOKEN" wechaty/wechaty
```

`WECHATY_TOKEN` is required here, because you need this key to managing wechaty on the chatbot cloud manager: https://www.wechaty.io

### Build

```bash
docker build -t wechaty .
```

### Ship

Easy use Wechaty via Container as a Service

* [Arukas Cloud](https://arukas.io/en/) - Hosting Docker Containers(Currently in Beta, provide up to 10 **free containers**)
* [Docker Cloud](https://cloud.docker.com/) - Docker Cloud is a hosted service that provides a Registry with the build and testing facilities for Dockerized application images, tools to help you set up and manage your host infrastructure, and deployment features to help you automate deploying your images to your infrastructure.
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

1. installed Chrome correctly
1. if you are under Linux, set headless right for `Xvfb`

Then you are set.

## Install from Github

In case that you want to dive deeper into Wechaty, fork & clone to run Wechaty bot on your machine, and start hacking.

### 1. Install Node.js

Node.js Version 6.0 or above is required.

1. Visit [Node.js](https://nodejs.org)
1. Download NodeJS Installer(i.e. "v6.2.0 Current")
1. Run Installer to install NodeJS to your machine

### 2. Fork & Clone Wechaty

If you have no GitHub account, you can just clone it via https:
```shell
git clone https://github.com/wechaty/wechaty.git
```
The above command will clone wechaty source code to your current directory.

### 3. Run Demo Bot

```shell
cd wechaty
npm install
npm run demo
```

After a little while, the bot will show you a message of a URL for Login QR Code. You need to scan this QR code in your wechat to permit your bot login.

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

# Documented

## wiki

1. [[IDE|IDE]]
1. [[Xvfb|Xvfb]]
1. [[TypeScript|TypeScript]]
1. [[NpmLog|NpmLog]]
1. [[SimilarProject|SimilarProject]]


# Trouble Shooting

If wechaty run unexpected, then unit test maybe help to find some useful message.

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

the environment variable `WECHATY_LOG` values:

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

```bat
set WECHATY_LOG=verbose
```

Tips: You may want to have more scroll buffer size in your CMD window in Windows.

```bat
mode con lines=32766
```
> http://stackoverflow.com/a/8775884/1123955

## DEBUG

set environment variable WECHATY_DEBUG to enable DEBUG in Wechaty.

this will:
1. open phantomjs debugger port on 8080

# Requirement

ECMAScript2015(ES6). I develop and test wechaty with Node.js v6.0.

# API Reference

I'll try my best to keep the API as simple as it can be.

## Events

Wechaty supports the following events:

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

`this` is `Sayable` for all listeners. here this is a `Wechaty` instance.

`this.say()` method will send message to `filehelper`, just for logging/reporting usage for your convenience

### 1. Event: `scan`

A `scan` event will be emitted when the bot needs to show you a QR Code for scanning.

```typescript
wechaty.on('scan', (this: Sayable, url: string, code: number) => {
  console.log(`[${code}] Scan ${url} to login.` )
})
```

1. URL: {String} the QR code image URL
2. code: {Number} the scan status code. some known status of the code list here is:
    1. 0    initial
    1. 200  login confirmed
    1. 201  scaned, wait for confirm
    1. 408  waits for scan

`scan` event will be emitted when it will detect a new code status change.

### 2. Event: `login`

After the bot login full successful, the event `login` will be emitted, with a [Contact](#class-contact) of current logined user.
```typescript
wechaty.on('login', (this: Sayable, user: Contact) => {
  console.log(`user ${user} login`)
})
```

### 3. Event: `logout`

`logout` will be emitted when bot detected log out, with a [Contact](#class-contact) of the current login user.

```typescript
wechaty.on('logout', (this: Sayable, user: Contact) => {
  console.log(`user ${user} logout`)
})
```

### 4. Event: `message`

Emit when there's a new message.

```typescript
wechaty.on('message', (this: Sayable, message: Message) => {
  console.log('message ${message} received')
})
```

### 5. Event: `error`

Emit when there's an error occurred.

```typescript
wechaty.on('error', (this: Sayable, err: Error) => {
  console.log('error ${err.message} received')
})
```
The `message` here is a [Message](#class-message).


### 6. Event: `friend`

`friend` event will be fired when we got a new friend request, or friendship is confirmed.

1. if `request?: FriendRequest` is set, then it's a friend request
1. if `request?: FriendRequest` is not set, then it's a friendship confirmation

```ts
wechaty.on('friend', (this: Sayable, contact: Contact, request?: FriendRequest) => {
  if (request) {  // 1. request to be friend from new contact
    request.accept()
    console.log('auto accepted for ' + contact + ' with message: ' + request.hello)
  } else {        // 2. confirm friend ship
    console.log('new friend ship confirmed with ' + contact))
  }
})
```

### 7. Event: `room-join`

```ts
wechaty.on('room-join', (this: Sayable, room: Room, inviteeList: Contact[], inviter: Contact) => {
  const nameList = inviteeList.map(c => c.name()).join(',')
  console.log(`Room ${room} got new member ${nameList}, invited by ${inviter}`)
})
```

### 8. Event: `room-leave`

```typescript
wechaty.on('room-leave', (this: Sayable, room: Room, leaverList: Contact[]) => {
  const nameList = leaverList.map(c => c.name()).join(',')
  console.log(`Room ${room} lost member ${nameList}`)
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

```typescript
const bot = Wechaty.instance({
  profile
})
```

1. `profile`(OPTIONAL): profile name. if a profile name is provided, wechaty will save login status to it, and automatically restored on next time of wechaty start(restart).
    * can be set by environment variable: `WECHATY_PROFILE`
1. ~~`token`(OPTIONAL): wechaty io token. Be used to connect to cloud bot manager.~~

### Wechaty.init(): Wechaty
Initialize the bot, return Promise.

```typescript
wechaty.init()
.then(() => {
  // do other stuff with bot here
}
```

### Wechaty.send(message: Message): Wechaty
send a `message`

```typescript
const msg = new Message()
msg.to('filehelper')
msg.content('hello')

wechaty.send(msg)
```

## Message Class

All wechat messages will be encapsulated as a Message.

`Message` is `Sayable`

### Message.from(contact?: Contact|string): Contact

get the sender from a message, or set it.

#### 1. Message.from(): Contact

get the sender from a message.

#### 2. Message.from(contact: Contact): void

set a sender to the message

#### 3. Message.from(contactId: string): void

set a sender to the message by contact id

### Message.to(contact?: Contact|Room|string): Contact|Room|void

get the receiver from a message, or set it.

#### 1. Message.to(): Contact|Room

get the destination of the message

#### 2. Message.to(contact: Contact): void

set the destination as Contact for the message

#### 3. Message.to(room: Room): void

set the destination as Room for the message

#### 4. Message.to(contactOrRoomId: string): void

set the destination as Room or Contact by id, for the message

### Message.room(room?: Room|string): Room|void

get the room from a message, or set it.

#### 1. Message.room(): Room | null

get the room from Message. 

if the message is not in a room, then will return `null`

#### 2. Message.room(room: Room): void

set the room for a Message

#### 3. Message.room(roomId: string): void

set the room by id for a Message

### Message.say(content: string): Promise<void>

reply a message to the sender.

### Message.ready(): Promise<Message>

A message may be not fully initialized yet. Call `ready()` to confirm we get all the data needed.

Return a Promise, will be resolved when all message data is ready.

```typescript
message.ready()
.then(() => {
  // Here we can be sure all the data is ready for use.
})
```

### Message.self(message: Message): boolean

Check if a message is sent by self.

Return `true` for send from self, `false` for send from others.

```typescript
if (message.self()) {
  console.log('this message is sent by myself!')
}
```

## Contact Class

`Contact` is `Sayable`

### Contact.id: string

Uniq id

### Contact.name(): string

get name from a contact

### Contact.remark(): string

get remark name from a contact

### Contact.remark(remark: string): Promise<boolean>

set remark name to a contact

return a Promise<boolean>, true for modify successful, false for failure.

### Contact.ready(): Promise<Contact>
A Contact may be not fully initialized yet. Call `ready()` to confirm we get all the data needed.

Return a Promise, will be resolved when all data is ready.

```typescript
contact.ready()
        .then(() => {
          // Here we can be sure all the data is ready for use.
        })
```

### Contact.say(content: string): Promise<void>

say `content` to Contact

## Class Room

`Room` is `Sayable`

Doc is cheap, show you code: [Example/Room-Bot](https://github.com/wechaty/wechaty/blob/master/example/room-bot.ts)

### Room.say(content: string, replyTo: Contact|Contact[]): Promise<void>

say `content` inside Room.

if you set `replyTo`, then `say()` will mention them as well.
> "@replyTo content"

### Room.ready(): Promise<Room>
A room may be not fully initialized yet. Call `ready()` to confirm we get all the data needed.

Return a Promise, will be resolved when all data is ready.

```typescript
room.ready()
    .then(() => {
      // Here we can be sure all the data is ready for use.
    })
```

### Room.refresh(): Promise<Room>

force reload data for Room

### Room Events

`this` is `Sayable` for all listeners.

which means there will be a `this.say()` the method inside listener call, you can use it sending a message to `filehelper`, just for logging/reporting usage for your convenience.

#### Event: `join`

```typescript
Room.on('join', (this: Room, inviteeList: Contact[], inviter: Contact) => void)
```

Event `join`: Room New Member

```typescript
room.on('join', function(inviteeList, inviter) {
  console.log(`the room ${room.topic()}, got new members invited by ${inviter.name()}`)
})
```

#### Event: `leave`

```typescript
Room.on('leave', (this: Room, leaverList: Contact[]) => void)
```

#### Event: `topic`

```typescript
Room.on('topic', (this: Room, topic: string, oldTopic: string, changer: Contact) => void)
```

### Query Type

```typescript
type Query = { topic: string|Regex }
Room.find(query : Query) : Room | null
Room.findAll(query : Query) : Room[]
```

### static Room.find(query: Query): Promise<Room>

### static Room.findAll(query: Query): Promise<Room[]>

### static Room.create(contactList: Contact[], topic?: string): Promise<void>

### Room.add(contact: Contact): Promise<void>

```typescript
const friend = message.get('from')
const room = Room.find({ name: 'Group Name' })
if (room) {
  room.add(friend)
}
```

### Room.del(contact: Contact): void

### Room.topic(): string

### Room.topic(newTopic: string): void

### Room.nick(contact: Contact): string

### Room.has(contact Contact): boolean

### Room.refresh(): Promise<Room>

### Room.owner(): Contact|null

### Room.member(name: string): Contact|null

### Room.memberList(): Contact[]

## Class FriendRequest

Send, receive friend request, and friend confirmation events.

When someone sends you a friend request, there will be a Wechaty `friend` event fired.

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

Doc is cheap, read code: [Example/Friend-Bot](https://github.com/wechaty/wechaty/blob/master/example/friend-bot.ts)

### FriendRequest.hello: string

verify message

### FriendRequest.accept(): void

accept a friend request

### FriendRequest.send(contact: Contact, hello: string): void

send a new friend request

```typescript
const from = message.from()
const request = new FriendRequest()
request.send(from, 'hello~')
```

# Test [![Coverage Status](https://coveralls.io/repos/github/wechaty/wechaty/badge.svg?branch=master)](https://coveralls.io/github/wechaty/wechaty?branch=master) [![Code Climate](https://codeclimate.com/github/wechaty/wechaty/badges/gpa.svg)](https://codeclimate.com/github/wechaty/wechaty) [![Issue Count](https://codeclimate.com/github/wechaty/wechaty/badges/issue_count.svg)](https://codeclimate.com/github/wechaty/wechaty) [![Test Coverage](https://codeclimate.com/github/wechaty/wechaty/badges/coverage.svg)](https://codeclimate.com/github/wechaty/wechaty/coverage)

Wechaty use ~~[TAP protocol](http://testanything.org/)~~ [AVA](https://github.com/avajs/ava) to test itself ~~by [tap](http://www.node-tap.org/)~~.

To test Wechaty, run:
```shell
npm test
```

* Know more about TAP: [Why I use Tape Instead of Mocha & So Should You](https://medium.com/javascript-scene/why-i-use-tape-instead-of-mocha-so-should-you-6aa105d8eaf4)

# Version History

[CHANGELOG](https://github.com/wechaty/wechaty/blob/master/CHANGELOG)

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
    - [ ] Use EventEmitter2 to emit message events so that we can use wildcard
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

## Chat Script
1. [SuperScript](http://superscriptjs.com/) A dialog system and bot engine for conversational UI's. (Pure Javascript)
2. [RiveScript](https://www.rivescript.com/) A simple scripting language for giving intelligence to chatbots and other conversational entities. (Perl original, Multi-Language support)
3. [CleverScript](https://www.cleverscript.com) Easily create text, voice or avatar bots that people can chat with in browser, app or their preferred messaging platform.

## Application
1. [助手管家](http://72c.me/a/m/yhmhrh) It's an Official Account of wechat, which can manage your personal wechat account as a robot assistant.

## Service
1. [Luis.ai](https://www.luis.ai) Language Understanding Intelligent Service (LUIS) offers a fast and effective way of adding language understanding to applications from Microsoft
1. [API.ai](https://api.ai) Build conversational user interfaces
1. [Wit.ai](https://wit.ai) Turn user input into action from Facebook
1. [Watson](http://www.ibm.com/smarterplanet/us/en/ibmwatson/developercloud/doc/dialog/) a comprehensive, robust, platform for managing conversations between virtual agents and users through an application programming interface (API) from IBM

* [Advanced Natural Language Processing Tools for Bot Makers](https://stanfy.com/blog/advanced-natural-language-processing-tools-for-bot-makers/) a good article of comparing the above services.

## Framework
1. [Bot Framework](https://dev.botframework.com/) Build and connect intelligent bots to interact with your users naturally wherever they are, from text/SMS to Skype, Slack, Office 365 mail and other popular services. from Microsoft

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
