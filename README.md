# Wechaty
Wechaty is Wechat for Bot.
It's a library/framework for easy creating wechat bot in 10 lines of code.

[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/zixia/wechaty?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)


# Why
My daily life/work is depends on wechat too heavy. 
* I have almost 14,000 wechat friends at May 2014, before new rule of 5000 friends max limit is set by wechat team.
* I have almost 400 wechat groups that almost all of them have more than 400 members.

So I need a tireless bot working on wechat 24/7, moniting the most important message for me. for example: highlights the messages which contain my name(especialy in a noisy group). ;-)

# Installation and Usage
The recommended installation method is a local NPM install for your project:
```bash
$ npm install --save wechaty
```

# Example
Wechaty is very easy to use. The following 10 lines code demoed a bot who can reply message for you:
```javascript
const Wechaty = require('../wechaty')
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

Notice that you need to wait a moment while bot trying to get the login QRCode from Wechat. 

As soon as the bot got login QRCode url, he will print url out. You need to scan the qrcode in wechat, and confirm login.

After that, bot will on duty.

# API

## Class Wechaty

```javascript
const bot = new Wechaty(options)
```

* `options.port`
* `options.puppet` 

### Wechaty.init()
Initialize the bot, return Promise.
```javascript
bot.init()
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
Callback will get a instance of Message Class. (see `Class Message`)

### Event: `login` & `logout`

To-Be-Support

## Class Message

The class that all messages will be encaped in.

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
Wechaty use TAP protocol to test itself by tape.

```bash
$ npm test
```

# Version History

## v0.0.5 (2016/5/11)
* receive & send message 
* show contacts info
* show groups info
* 1st usable version
* start coding from 1st May 2016

# Todo List
1. Deal with friend request
1. Manage contacts(send friend request/delete contact etc.)
1. You are welcome to issue your needs.

# Known Issues & Support
1. phantomjs not work(no socket.io connect from browser)
2. firefox need to use unstable mode(or inject will be blocked almost forever)

Github Issue - https://github.com/zixia/wechaty/issues

# Contributing
* Lint: eslint
    ```bash
    $ npm lint
    ```
* Create a issue, then send me a pull request.

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
