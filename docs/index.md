# Wechaty v0.48.2 Documentation

- Website - <https://wechaty.js.org>
- Docs Site - <https://wechaty.js.org/docs/>
- API References - <https://wechaty.github.io/wechaty/>

## Classes

<dl>
<dt><a href="#Wechaty">Wechaty</a></dt>
<dd><p>Main bot class.</p>
<p>A <code>Bot</code> is a WeChat client depends on which puppet you use.
It may equals</p>
<ul>
<li>web-WeChat, when you use: <a href="https://github.com/wechaty/wechaty-puppet-puppeteer">puppet-puppeteer</a>/<a href="https://github.com/wechaty/wechaty-puppet-wechat4u">puppet-wechat4u</a></li>
<li>ipad-WeChat, when you use: <a href="https://github.com/wechaty/wechaty-puppet-padchat">puppet-padchat</a></li>
<li>ios-WeChat, when you use: puppet-ioscat</li>
</ul>
<p>See more:</p>
<ul>
<li><a href="https://github.com/wechaty/wechaty-getting-started/wiki/FAQ-EN#31-what-is-a-puppet-in-wechaty">What is a Puppet in Wechaty</a></li>
</ul>
<blockquote>
<p>If you want to know how to send message, see <a href="#Message">Message</a> <br>
If you want to know how to get contact, see <a href="#Contact">Contact</a></p>
</blockquote>
</dd>
<dt><a href="#Room">Room</a></dt>
<dd><p>All WeChat rooms(groups) will be encapsulated as a Room.</p>
<p><a href="https://github.com/wechaty/wechaty/blob/1523c5e02be46ebe2cc172a744b2fbe53351540e/examples/room-bot.ts">Examples/Room-Bot</a></p>
</dd>
<dt><a href="#Contact">Contact</a></dt>
<dd><p>All wechat contacts(friend) will be encapsulated as a Contact.
<a href="https://github.com/wechaty/wechaty/blob/1523c5e02be46ebe2cc172a744b2fbe53351540e/examples/contact-bot.ts">Examples/Contact-Bot</a></p>
</dd>
<dt><a href="#ContactSelf">ContactSelf</a></dt>
<dd><p>Bot itself will be encapsulated as a ContactSelf.</p>
<blockquote>
<p>Tips: this class is extends Contact</p>
</blockquote>
</dd>
<dt><a href="#Friendship">Friendship</a></dt>
<dd><p>Send, receive friend request, and friend confirmation events.</p>
<ol>
<li>send request</li>
<li>receive request(in friend event)</li>
<li>confirmation friendship(friend event)</li>
</ol>
<p><a href="https://github.com/wechaty/wechaty/blob/1523c5e02be46ebe2cc172a744b2fbe53351540e/examples/friend-bot.ts">Examples/Friend-Bot</a></p>
</dd>
<dt><a href="#Message">Message</a></dt>
<dd><p>All wechat messages will be encapsulated as a Message.</p>
<p><a href="https://github.com/wechaty/wechaty/blob/1523c5e02be46ebe2cc172a744b2fbe53351540e/examples/ding-dong-bot.ts">Examples/Ding-Dong-Bot</a></p>
</dd>
<dt><a href="#RoomInvitation">RoomInvitation</a></dt>
<dd><p>accept room invitation</p>
</dd>
</dl>

## Constants

<dl>
<dt><a href="#cuid_1">cuid_1</a></dt>
<dd><p>Wechaty Chatbot SDK - <a href="https://github.com/wechaty/wechaty">https://github.com/wechaty/wechaty</a></p>
</dd>
<dt><a href="#clone_class_1">clone_class_1</a></dt>
<dd><p>Wechaty Chatbot SDK - <a href="https://github.com/wechaty/wechaty">https://github.com/wechaty/wechaty</a></p>
</dd>
<dt><a href="#clone_class_1">clone_class_1</a></dt>
<dd><p>Wechaty Chatbot SDK - <a href="https://github.com/wechaty/wechaty">https://github.com/wechaty/wechaty</a></p>
</dd>
<dt><a href="#wechaty_puppet_1">wechaty_puppet_1</a></dt>
<dd><p>Wechaty Chatbot SDK - <a href="https://github.com/wechaty/wechaty">https://github.com/wechaty/wechaty</a></p>
</dd>
<dt><a href="#events_1">events_1</a></dt>
<dd><p>Wechaty Chatbot SDK - <a href="https://github.com/wechaty/wechaty">https://github.com/wechaty/wechaty</a></p>
</dd>
<dt><a href="#events_1">events_1</a></dt>
<dd><p>Wechaty Chatbot SDK - <a href="https://github.com/wechaty/wechaty">https://github.com/wechaty/wechaty</a></p>
</dd>
<dt><a href="#clone_class_1">clone_class_1</a></dt>
<dd><p>Wechaty Chatbot SDK - <a href="https://github.com/wechaty/wechaty">https://github.com/wechaty/wechaty</a></p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#guardWechatify">guardWechatify()</a></dt>
<dd><p>Huan(202008): we will bind the wechaty puppet with user modules (Contact, Room, etc) together inside the start() method</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#PuppetModuleName">PuppetModuleName</a></dt>
<dd><p>The term <a href="https://github.com/wechaty/wechaty/wiki/Puppet">Puppet</a> in Wechaty is an Abstract Class for implementing protocol plugins.
The plugins are the component that helps Wechaty to control the WeChat(that&#39;s the reason we call it puppet).
The plugins are named XXXPuppet, for example:</p>
<ul>
<li><a href="https://github.com/wechaty/wechaty-puppet-puppeteer">PuppetPuppeteer</a>:</li>
<li><a href="https://github.com/wechaty/wechaty-puppet-padchat">PuppetPadchat</a></li>
</ul>
</dd>
<dt><a href="#WechatyOptions">WechatyOptions</a></dt>
<dd><p>The option parameter to create a wechaty instance</p>
</dd>
<dt><a href="#RoomQueryFilter">RoomQueryFilter</a></dt>
<dd><p>The filter to find the room:  {topic: string | RegExp}</p>
</dd>
<dt><a href="#RoomEventName">RoomEventName</a></dt>
<dd><p>Room Class Event Type</p>
</dd>
<dt><a href="#RoomEventFunction">RoomEventFunction</a></dt>
<dd><p>Room Class Event Function</p>
</dd>
<dt><a href="#RoomMemberQueryFilter">RoomMemberQueryFilter</a></dt>
<dd><p>The way to search member by Room.member()</p>
</dd>
<dt><a href="#ContactQueryFilter">ContactQueryFilter</a></dt>
<dd><p>The way to search Contact</p>
</dd>
</dl>

<a name="Wechaty"></a>

## Wechaty
Main bot class.

A `Bot` is a WeChat client depends on which puppet you use.
It may equals
- web-WeChat, when you use: [puppet-puppeteer](https://github.com/wechaty/wechaty-puppet-puppeteer)/[puppet-wechat4u](https://github.com/wechaty/wechaty-puppet-wechat4u)
- ipad-WeChat, when you use: [puppet-padchat](https://github.com/wechaty/wechaty-puppet-padchat)
- ios-WeChat, when you use: puppet-ioscat

See more:
- [What is a Puppet in Wechaty](https://github.com/wechaty/wechaty-getting-started/wiki/FAQ-EN#31-what-is-a-puppet-in-wechaty)

> If you want to know how to send message, see [Message](#Message) <br>
> If you want to know how to get contact, see [Contact](#Contact)

**Kind**: global class  

* [Wechaty](#Wechaty)
    * [new Wechaty([options])](#new_Wechaty_new)
    * _instance_
        * [.wechatifiedContact](#Wechaty+wechatifiedContact)
        * [.name()](#Wechaty+name)
        * [.use(...plugins)](#Wechaty+use) ⇒ [<code>Wechaty</code>](#Wechaty)
        * [.start()](#Wechaty+start) ⇒ <code>Promise.&lt;void&gt;</code>
        * [.stop()](#Wechaty+stop) ⇒ <code>Promise.&lt;void&gt;</code>
        * [.logout()](#Wechaty+logout) ⇒ <code>Promise.&lt;void&gt;</code>
        * [.logonoff()](#Wechaty+logonoff) ⇒ <code>boolean</code>
        * [.userSelf()](#Wechaty+userSelf) ⇒ [<code>ContactSelf</code>](#ContactSelf)
        * [.say(something)](#Wechaty+say) ⇒ <code>Promise.&lt;void&gt;</code>
    * _static_
        * [.instance([options])](#Wechaty.instance)
        * [.use(...plugins)](#Wechaty.use) ⇒ [<code>Wechaty</code>](#Wechaty)

<a name="new_Wechaty_new"></a>

### new Wechaty([options])
Creates an instance of Wechaty.


| Param | Type | Default |
| --- | --- | --- |
| [options] | [<code>WechatyOptions</code>](#WechatyOptions) | <code>{}</code> | 

**Example** *(The World&#x27;s Shortest ChatBot Code: 6 lines of JavaScript)*  
```js
const { Wechaty } = require('wechaty')
const bot = new Wechaty()
bot.on('scan',    (qrCode, status) => console.log('https://wechaty.js.org/qrcode/' + encodeURIComponent(qrcode)))
bot.on('login',   user => console.log(`User ${user} logged in`))
bot.on('message', message => console.log(`Message: ${message}`))
bot.start()
```
<a name="Wechaty+wechatifiedContact"></a>

### wechaty.wechatifiedContact
1. Setup Wechaty User Classes

**Kind**: instance property of [<code>Wechaty</code>](#Wechaty)  
<a name="Wechaty+name"></a>

### wechaty.name()
Wechaty bot name set by `options.name`
default: `wechaty`

**Kind**: instance method of [<code>Wechaty</code>](#Wechaty)  
<a name="Wechaty+use"></a>

### wechaty.use(...plugins) ⇒ [<code>Wechaty</code>](#Wechaty)
For wechaty ecosystem, allow user to define a 3rd party plugin for the current wechaty instance.

**Kind**: instance method of [<code>Wechaty</code>](#Wechaty)  
**Returns**: [<code>Wechaty</code>](#Wechaty) - - this for chaining,  

| Param | Type | Description |
| --- | --- | --- |
| ...plugins | <code>Array.&lt;WechatyPlugin&gt;</code> | The plugins you want to use |

**Example**  
```js
// The same usage with Wechaty.use().
```
<a name="Wechaty+start"></a>

### wechaty.start() ⇒ <code>Promise.&lt;void&gt;</code>
When you start the bot, bot will begin to login, need you WeChat scan qrcode to login
> Tips: All the bot operation needs to be triggered after start() is done

**Kind**: instance method of [<code>Wechaty</code>](#Wechaty)  
**Example**  
```js
await bot.start()
// do other stuff with bot here
```
<a name="Wechaty+stop"></a>

### wechaty.stop() ⇒ <code>Promise.&lt;void&gt;</code>
Stop the bot

**Kind**: instance method of [<code>Wechaty</code>](#Wechaty)  
**Example**  
```js
await bot.stop()
```
<a name="Wechaty+logout"></a>

### wechaty.logout() ⇒ <code>Promise.&lt;void&gt;</code>
Logout the bot

**Kind**: instance method of [<code>Wechaty</code>](#Wechaty)  
**Example**  
```js
await bot.logout()
```
<a name="Wechaty+logonoff"></a>

### wechaty.logonoff() ⇒ <code>boolean</code>
Get the logon / logoff state

**Kind**: instance method of [<code>Wechaty</code>](#Wechaty)  
**Example**  
```js
if (bot.logonoff()) {
  console.log('Bot logged in')
} else {
  console.log('Bot not logged in')
}
```
<a name="Wechaty+userSelf"></a>

### wechaty.userSelf() ⇒ [<code>ContactSelf</code>](#ContactSelf)
Get current user

**Kind**: instance method of [<code>Wechaty</code>](#Wechaty)  
**Example**  
```js
const contact = bot.userSelf()
console.log(`Bot is ${contact.name()}`)
```
<a name="Wechaty+say"></a>

### wechaty.say(something) ⇒ <code>Promise.&lt;void&gt;</code>
Send message to userSelf, in other words, bot send message to itself.
> Tips:
This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/wechaty/wechaty/wiki/Puppet#3-puppet-compatible-table)

**Kind**: instance method of [<code>Wechaty</code>](#Wechaty)  

| Param | Type | Description |
| --- | --- | --- |
| something | <code>string</code> \| [<code>Contact</code>](#Contact) \| <code>FileBox</code> \| <code>UrlLink</code> \| <code>MiniProgram</code> | send text, Contact, or file to bot. </br> You can use [FileBox](https://www.npmjs.com/package/file-box) to send file |

**Example**  
```js
const bot = new Wechaty()
await bot.start()
// after logged in

// 1. send text to bot itself
await bot.say('hello!')

// 2. send Contact to bot itself
const contact = await bot.Contact.find()
await bot.say(contact)

// 3. send Image to bot itself from remote url
import { FileBox }  from 'wechaty'
const fileBox = FileBox.fromUrl('https://wechaty.github.io/wechaty/images/bot-qr-code.png')
await bot.say(fileBox)

// 4. send Image to bot itself from local file
import { FileBox }  from 'wechaty'
const fileBox = FileBox.fromFile('/tmp/text.jpg')
await bot.say(fileBox)

// 5. send Link to bot itself
const linkPayload = new UrlLink ({
  description : 'WeChat Bot SDK for Individual Account, Powered by TypeScript, Docker, and Love',
  thumbnailUrl: 'https://avatars0.githubusercontent.com/u/25162437?s=200&v=4',
  title       : 'Welcome to Wechaty',
  url         : 'https://github.com/wechaty/wechaty',
})
await bot.say(linkPayload)

// 6. send MiniProgram to bot itself
const miniPayload = new MiniProgram ({
  username           : 'gh_xxxxxxx',     //get from mp.weixin.qq.com
  appid              : '',               //optional, get from mp.weixin.qq.com
  title              : '',               //optional
  pagepath           : '',               //optional
  description        : '',               //optional
  thumbnailurl       : '',               //optional
})
await bot.say(miniPayload)
```
<a name="Wechaty.instance"></a>

### Wechaty.instance([options])
Get the global instance of Wechaty

**Kind**: static method of [<code>Wechaty</code>](#Wechaty)  

| Param | Type | Default |
| --- | --- | --- |
| [options] | [<code>WechatyOptions</code>](#WechatyOptions) | <code>{}</code> | 

**Example** *(The World&#x27;s Shortest ChatBot Code: 6 lines of JavaScript)*  
```js
const { Wechaty } = require('wechaty')

Wechaty.instance() // Global instance
.on('scan', (url, status) => console.log(`Scan QR Code to login: ${status}\n${url}`))
.on('login',       user => console.log(`User ${user} logged in`))
.on('message',  message => console.log(`Message: ${message}`))
.start()
```
<a name="Wechaty.use"></a>

### Wechaty.use(...plugins) ⇒ [<code>Wechaty</code>](#Wechaty)
For wechaty ecosystem, allow user to define a 3rd party plugin for the all wechaty instances

**Kind**: static method of [<code>Wechaty</code>](#Wechaty)  
**Returns**: [<code>Wechaty</code>](#Wechaty) - - this for chaining,  

| Param | Type | Description |
| --- | --- | --- |
| ...plugins | <code>Array.&lt;WechatyPlugin&gt;</code> | The plugins you want to use |

**Example**  
```js
// Report all chat message to my server.

function WechatyReportPlugin(options: { url: string }) {
  return function (this: Wechaty) {
    this.on('message', message => http.post(options.url, { data: message }))
  }
}

bot.use(WechatyReportPlugin({ url: 'http://somewhere.to.report.your.data.com' })
```
<a name="Room"></a>

## Room
All WeChat rooms(groups) will be encapsulated as a Room.

[Examples/Room-Bot](https://github.com/wechaty/wechaty/blob/1523c5e02be46ebe2cc172a744b2fbe53351540e/examples/room-bot.ts)

**Kind**: global class  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | Room id. This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/wechaty/wechaty/wiki/Puppet#3-puppet-compatible-table) |


* [Room](#Room)
    * _instance_
        * [.sync()](#Room+sync) ⇒ <code>Promise.&lt;void&gt;</code>
        * [.say(textOrContactOrFileOrUrlOrMini, [mention])](#Room+say) ⇒ <code>Promise.&lt;(void\|Message)&gt;</code>
        * [.add(contact)](#Room+add) ⇒ <code>Promise.&lt;void&gt;</code>
        * [.del(contact)](#Room+del) ⇒ <code>Promise.&lt;void&gt;</code>
        * [.quit()](#Room+quit) ⇒ <code>Promise.&lt;void&gt;</code>
        * [.topic([newTopic])](#Room+topic) ⇒ <code>Promise.&lt;(string\|void)&gt;</code>
        * [.announce([text])](#Room+announce) ⇒ <code>Promise.&lt;(void\|string)&gt;</code>
        * [.qrCode()](#Room+qrCode) ⇒ <code>Promise.&lt;string&gt;</code>
        * [.alias(contact)](#Room+alias) ⇒ <code>Promise.&lt;(string\|null)&gt;</code>
        * [.has(contact)](#Room+has) ⇒ <code>Promise.&lt;boolean&gt;</code>
        * [.memberAll([query])](#Room+memberAll) ⇒ <code>Promise.&lt;Array.&lt;Contact&gt;&gt;</code>
        * [.member(queryArg)](#Room+member) ⇒ <code>Promise.&lt;(null\|Contact)&gt;</code>
        * [.owner()](#Room+owner) ⇒ [<code>Contact</code>](#Contact) \| <code>null</code>
        * [.avatar()](#Room+avatar) ⇒ <code>FileBox</code>
    * _static_
        * [.create(contactList, [topic])](#Room.create) ⇒ [<code>Promise.&lt;Room&gt;</code>](#Room)
        * [.findAll([query])](#Room.findAll) ⇒ <code>Promise.&lt;Array.&lt;Room&gt;&gt;</code>
        * [.find(query)](#Room.find) ⇒ <code>Promise.&lt;(Room\|null)&gt;</code>

<a name="Room+sync"></a>

### room.sync() ⇒ <code>Promise.&lt;void&gt;</code>
Force reload data for Room, Sync data from puppet API again.

**Kind**: instance method of [<code>Room</code>](#Room)  
**Example**  
```js
await room.sync()
```
<a name="Room+say"></a>

### room.say(textOrContactOrFileOrUrlOrMini, [mention]) ⇒ <code>Promise.&lt;(void\|Message)&gt;</code>
Send message inside Room, if set [replyTo], wechaty will mention the contact as well.
> Tips:
This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/wechaty/wechaty/wiki/Puppet#3-puppet-compatible-table)

**Kind**: instance method of [<code>Room</code>](#Room)  

| Param | Type | Description |
| --- | --- | --- |
| textOrContactOrFileOrUrlOrMini | <code>string</code> \| [<code>Contact</code>](#Contact) \| <code>FileBox</code> | Send `text` or `media file` inside Room. <br> You can use [FileBox](https://www.npmjs.com/package/file-box) to send file |
| [mention] | [<code>Contact</code>](#Contact) \| [<code>Array.&lt;Contact&gt;</code>](#Contact) | Optional parameter, send content inside Room, and mention @replyTo contact or contactList. |

**Example**  
```js
const bot = new Wechaty()
await bot.start()
// after logged in...
const room = await bot.Room.find({topic: 'wechaty'})

// 1. Send text inside Room

await room.say('Hello world!')
const msg = await room.say('Hello world!') // only supported by puppet-padplus

// 2. Send media file inside Room
import { FileBox }  from 'wechaty'
const fileBox1 = FileBox.fromUrl('https://wechaty.github.io/wechaty/images/bot-qr-code.png')
const fileBox2 = FileBox.fromLocal('/tmp/text.txt')
await room.say(fileBox1)
const msg1 = await room.say(fileBox1) // only supported by puppet-padplus
await room.say(fileBox2)
const msg2 = await room.say(fileBox2) // only supported by puppet-padplus

// 3. Send Contact Card in a room
const contactCard = await bot.Contact.find({name: 'lijiarui'}) // change 'lijiarui' to any of the room member
await room.say(contactCard)
const msg = await room.say(contactCard) // only supported by puppet-padplus

// 4. Send text inside room and mention @mention contact
const contact = await bot.Contact.find({name: 'lijiarui'}) // change 'lijiarui' to any of the room member
await room.say('Hello world!', contact)
const msg = await room.say('Hello world!', contact) // only supported by puppet-padplus

// 5. Send text inside room and mention someone with Tagged Template
const contact2 = await bot.Contact.find({name: 'zixia'}) // change 'zixia' to any of the room member
await room.say`Hello ${contact}, here is the world ${contact2}`
const msg = await room.say`Hello ${contact}, here is the world ${contact2}` // only supported by puppet-padplus

// 6. send url link in a room

const urlLink = new UrlLink ({
  description : 'WeChat Bot SDK for Individual Account, Powered by TypeScript, Docker, and Love',
  thumbnailUrl: 'https://avatars0.githubusercontent.com/u/25162437?s=200&v=4',
  title       : 'Welcome to Wechaty',
  url         : 'https://github.com/wechaty/wechaty',
})
await room.say(urlLink)
const msg = await room.say(urlLink) // only supported by puppet-padplus

// 7. send mini program in a room

const miniProgram = new MiniProgram ({
  username           : 'gh_xxxxxxx',     //get from mp.weixin.qq.com
  appid              : '',               //optional, get from mp.weixin.qq.com
  title              : '',               //optional
  pagepath           : '',               //optional
  description        : '',               //optional
  thumbnailurl       : '',               //optional
})
await room.say(miniProgram)
const msg = await room.say(miniProgram) // only supported by puppet-padplus
```
<a name="Room+add"></a>

### room.add(contact) ⇒ <code>Promise.&lt;void&gt;</code>
Add contact in a room

> Tips:
This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/wechaty/wechaty/wiki/Puppet#3-puppet-compatible-table)
>
> see [Web version of WeChat closed group interface](https://github.com/wechaty/wechaty/issues/1441)

**Kind**: instance method of [<code>Room</code>](#Room)  

| Param | Type |
| --- | --- |
| contact | [<code>Contact</code>](#Contact) | 

**Example**  
```js
const bot = new Wechaty()
await bot.start()
// after logged in...
const contact = await bot.Contact.find({name: 'lijiarui'}) // change 'lijiarui' to any contact in your WeChat
const room = await bot.Room.find({topic: 'WeChat'})        // change 'WeChat' to any room topic in your WeChat
if (room) {
  try {
     await room.add(contact)
  } catch(e) {
     console.error(e)
  }
}
```
<a name="Room+del"></a>

### room.del(contact) ⇒ <code>Promise.&lt;void&gt;</code>
Delete a contact from the room
It works only when the bot is the owner of the room

> Tips:
This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/wechaty/wechaty/wiki/Puppet#3-puppet-compatible-table)
>
> see [Web version of WeChat closed group interface](https://github.com/wechaty/wechaty/issues/1441)

**Kind**: instance method of [<code>Room</code>](#Room)  

| Param | Type |
| --- | --- |
| contact | [<code>Contact</code>](#Contact) | 

**Example**  
```js
const bot = new Wechaty()
await bot.start()
// after logged in...
const room = await bot.Room.find({topic: 'WeChat'})          // change 'WeChat' to any room topic in your WeChat
const contact = await bot.Contact.find({name: 'lijiarui'})   // change 'lijiarui' to any room member in the room you just set
if (room) {
  try {
     await room.del(contact)
  } catch(e) {
     console.error(e)
  }
}
```
<a name="Room+quit"></a>

### room.quit() ⇒ <code>Promise.&lt;void&gt;</code>
Bot quit the room itself

> Tips:
This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/wechaty/wechaty/wiki/Puppet#3-puppet-compatible-table)

**Kind**: instance method of [<code>Room</code>](#Room)  
**Example**  
```js
await room.quit()
```
<a name="Room+topic"></a>

### room.topic([newTopic]) ⇒ <code>Promise.&lt;(string\|void)&gt;</code>
SET/GET topic from the room

**Kind**: instance method of [<code>Room</code>](#Room)  

| Param | Type | Description |
| --- | --- | --- |
| [newTopic] | <code>string</code> | If set this para, it will change room topic. |

**Example** *(When you say anything in a room, it will get room topic. )*  
```js
const bot = new Wechaty()
bot
.on('message', async m => {
  const room = m.room()
  if (room) {
    const topic = await room.topic()
    console.log(`room topic is : ${topic}`)
  }
})
.start()
```
**Example** *(When you say anything in a room, it will change room topic. )*  
```js
const bot = new Wechaty()
bot
.on('message', async m => {
  const room = m.room()
  if (room) {
    const oldTopic = await room.topic()
    await room.topic('change topic to wechaty!')
    console.log(`room topic change from ${oldTopic} to ${room.topic()}`)
  }
})
.start()
```
<a name="Room+announce"></a>

### room.announce([text]) ⇒ <code>Promise.&lt;(void\|string)&gt;</code>
SET/GET announce from the room
> Tips: It only works when bot is the owner of the room.
>
> This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/wechaty/wechaty/wiki/Puppet#3-puppet-compatible-table)

**Kind**: instance method of [<code>Room</code>](#Room)  

| Param | Type | Description |
| --- | --- | --- |
| [text] | <code>string</code> | If set this para, it will change room announce. |

**Example** *(When you say anything in a room, it will get room announce. )*  
```js
const bot = new Wechaty()
await bot.start()
// after logged in...
const room = await bot.Room.find({topic: 'your room'})
const announce = await room.announce()
console.log(`room announce is : ${announce}`)
```
**Example** *(When you say anything in a room, it will change room announce. )*  
```js
const bot = new Wechaty()
await bot.start()
// after logged in...
const room = await bot.Room.find({topic: 'your room'})
const oldAnnounce = await room.announce()
await room.announce('change announce to wechaty!')
console.log(`room announce change from ${oldAnnounce} to ${room.announce()}`)
```
<a name="Room+qrCode"></a>

### room.qrCode() ⇒ <code>Promise.&lt;string&gt;</code>
Get QR Code Value of the Room from the room, which can be used as scan and join the room.
> Tips:
1. This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/wechaty/wechaty/wiki/Puppet#3-puppet-compatible-table)
2. The return should be the QR Code Data, instead of the QR Code Image. (the data should be less than 8KB. See: https://stackoverflow.com/a/12764370/1123955 )

**Kind**: instance method of [<code>Room</code>](#Room)  
<a name="Room+alias"></a>

### room.alias(contact) ⇒ <code>Promise.&lt;(string\|null)&gt;</code>
Return contact's roomAlias in the room

**Kind**: instance method of [<code>Room</code>](#Room)  
**Returns**: <code>Promise.&lt;(string\|null)&gt;</code> - - If a contact has an alias in room, return string, otherwise return null  

| Param | Type |
| --- | --- |
| contact | [<code>Contact</code>](#Contact) | 

**Example**  
```js
const bot = new Wechaty()
bot
.on('message', async m => {
  const room = m.room()
  const contact = m.from()
  if (room) {
    const alias = await room.alias(contact)
    console.log(`${contact.name()} alias is ${alias}`)
  }
})
.start()
```
<a name="Room+has"></a>

### room.has(contact) ⇒ <code>Promise.&lt;boolean&gt;</code>
Check if the room has member `contact`, the return is a Promise and must be `await`-ed

**Kind**: instance method of [<code>Room</code>](#Room)  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - Return `true` if has contact, else return `false`.  

| Param | Type |
| --- | --- |
| contact | [<code>Contact</code>](#Contact) | 

**Example** *(Check whether &#x27;lijiarui&#x27; is in the room &#x27;wechaty&#x27;)*  
```js
const bot = new Wechaty()
await bot.start()
// after logged in...
const contact = await bot.Contact.find({name: 'lijiarui'})   // change 'lijiarui' to any of contact in your WeChat
const room = await bot.Room.find({topic: 'wechaty'})         // change 'wechaty' to any of the room in your WeChat
if (contact && room) {
  if (await room.has(contact)) {
    console.log(`${contact.name()} is in the room wechaty!`)
  } else {
    console.log(`${contact.name()} is not in the room wechaty!`)
  }
}
```
<a name="Room+memberAll"></a>

### room.memberAll([query]) ⇒ <code>Promise.&lt;Array.&lt;Contact&gt;&gt;</code>
Find all contacts in a room

#### definition
- `name`                 the name-string set by user-self, should be called name, equal to `Contact.name()`
- `roomAlias`            the name-string set by user-self in the room, should be called roomAlias
- `contactAlias`         the name-string set by bot for others, should be called alias, equal to `Contact.alias()`

**Kind**: instance method of [<code>Room</code>](#Room)  

| Param | Type | Description |
| --- | --- | --- |
| [query] | [<code>RoomMemberQueryFilter</code>](#RoomMemberQueryFilter) \| <code>string</code> | Optional parameter, When use memberAll(name:string), return all matched members, including name, roomAlias, contactAlias |

**Example**  
```js
const roomList:Contact[] | null = await room.findAll()
if(roomList)
 console.log(`room all member list: `, roomList)
const memberContactList: Contact[] | null =await room.findAll(`abc`)
console.log(`contact list with all name, room alias, alias are abc:`, memberContactList)
```
<a name="Room+member"></a>

### room.member(queryArg) ⇒ <code>Promise.&lt;(null\|Contact)&gt;</code>
Find all contacts in a room, if get many, return the first one.

**Kind**: instance method of [<code>Room</code>](#Room)  

| Param | Type | Description |
| --- | --- | --- |
| queryArg | [<code>RoomMemberQueryFilter</code>](#RoomMemberQueryFilter) \| <code>string</code> | When use member(name:string), return all matched members, including name, roomAlias, contactAlias |

**Example** *(Find member by name)*  
```js
const bot = new Wechaty()
await bot.start()
// after logged in...
const room = await bot.Room.find({topic: 'wechaty'})           // change 'wechaty' to any room name in your WeChat
if (room) {
  const member = await room.member('lijiarui')             // change 'lijiarui' to any room member in your WeChat
  if (member) {
    console.log(`wechaty room got the member: ${member.name()}`)
  } else {
    console.log(`cannot get member in wechaty room!`)
  }
}
```
**Example** *(Find member by MemberQueryFilter)*  
```js
const bot = new Wechaty()
await bot.start()
// after logged in...
const room = await bot.Room.find({topic: 'wechaty'})          // change 'wechaty' to any room name in your WeChat
if (room) {
  const member = await room.member({name: 'lijiarui'})        // change 'lijiarui' to any room member in your WeChat
  if (member) {
    console.log(`wechaty room got the member: ${member.name()}`)
  } else {
    console.log(`cannot get member in wechaty room!`)
  }
}
```
<a name="Room+owner"></a>

### room.owner() ⇒ [<code>Contact</code>](#Contact) \| <code>null</code>
Get room's owner from the room.
> Tips:
This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/wechaty/wechaty/wiki/Puppet#3-puppet-compatible-table)

**Kind**: instance method of [<code>Room</code>](#Room)  
**Example**  
```js
const owner = room.owner()
```
<a name="Room+avatar"></a>

### room.avatar() ⇒ <code>FileBox</code>
Get avatar from the room.

**Kind**: instance method of [<code>Room</code>](#Room)  
**Example**  
```js
const fileBox = await room.avatar()
const name = fileBox.name
fileBox.toFile(name)
```
<a name="Room.create"></a>

### Room.create(contactList, [topic]) ⇒ [<code>Promise.&lt;Room&gt;</code>](#Room)
Create a new room.

**Kind**: static method of [<code>Room</code>](#Room)  

| Param | Type |
| --- | --- |
| contactList | [<code>Array.&lt;Contact&gt;</code>](#Contact) | 
| [topic] | <code>string</code> | 

**Example** *(Creat a room with &#x27;lijiarui&#x27; and &#x27;huan&#x27;, the room topic is &#x27;ding - created&#x27;)*  
```js
const helperContactA = await Contact.find({ name: 'lijiarui' })  // change 'lijiarui' to any contact in your WeChat
const helperContactB = await Contact.find({ name: 'huan' })  // change 'huan' to any contact in your WeChat
const contactList = [helperContactA, helperContactB]
console.log('Bot', 'contactList: %s', contactList.join(','))
const room = await Room.create(contactList, 'ding')
console.log('Bot', 'createDingRoom() new ding room created: %s', room)
await room.topic('ding - created')
await room.say('ding - created')
```
<a name="Room.findAll"></a>

### Room.findAll([query]) ⇒ <code>Promise.&lt;Array.&lt;Room&gt;&gt;</code>
Find room by by filter: {topic: string | RegExp}, return all the matched room

**Kind**: static method of [<code>Room</code>](#Room)  

| Param | Type |
| --- | --- |
| [query] | [<code>RoomQueryFilter</code>](#RoomQueryFilter) | 

**Example**  
```js
const bot = new Wechaty()
await bot.start()
// after logged in
const roomList = await bot.Room.findAll()                    // get the room list of the bot
const roomList = await bot.Room.findAll({topic: 'wechaty'})  // find all of the rooms with name 'wechaty'
```
<a name="Room.find"></a>

### Room.find(query) ⇒ <code>Promise.&lt;(Room\|null)&gt;</code>
Try to find a room by filter: {topic: string | RegExp}. If get many, return the first one.

**Kind**: static method of [<code>Room</code>](#Room)  
**Returns**: <code>Promise.&lt;(Room\|null)&gt;</code> - If can find the room, return Room, or return null  

| Param | Type |
| --- | --- |
| query | [<code>RoomQueryFilter</code>](#RoomQueryFilter) | 

**Example**  
```js
const bot = new Wechaty()
await bot.start()
// after logged in...
const roomList = await bot.Room.find()
const roomList = await bot.Room.find({topic: 'wechaty'})
```
<a name="Contact"></a>

## Contact
All wechat contacts(friend) will be encapsulated as a Contact.
[Examples/Contact-Bot](https://github.com/wechaty/wechaty/blob/1523c5e02be46ebe2cc172a744b2fbe53351540e/examples/contact-bot.ts)

**Kind**: global class  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | Get Contact id. This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/wechaty/wechaty/wiki/Puppet#3-puppet-compatible-table) |


* [Contact](#Contact)
    * _instance_
        * [.say(something)](#Contact+say) ⇒ <code>Promise.&lt;(void\|Message)&gt;</code>
        * [.name()](#Contact+name) ⇒ <code>string</code>
        * [.alias(newAlias)](#Contact+alias) ⇒ <code>Promise.&lt;(null\|string\|void)&gt;</code>
        * [.friend()](#Contact+friend) ⇒ <code>boolean</code> \| <code>null</code>
        * [.type()](#Contact+type) ⇒ <code>ContactType.Unknown</code> \| <code>ContactType.Personal</code> \| <code>ContactType.Official</code>
        * [.gender()](#Contact+gender) ⇒ <code>ContactGender.Unknown</code> \| <code>ContactGender.Male</code> \| <code>ContactGender.Female</code>
        * [.province()](#Contact+province) ⇒ <code>string</code> \| <code>null</code>
        * [.city()](#Contact+city) ⇒ <code>string</code> \| <code>null</code>
        * [.avatar()](#Contact+avatar) ⇒ <code>Promise.&lt;FileBox&gt;</code>
        * [.tags()](#Contact+tags) ⇒ <code>Promise.&lt;Array.&lt;Tag&gt;&gt;</code>
        * [.sync()](#Contact+sync) ⇒ <code>Promise.&lt;this&gt;</code>
        * [.self()](#Contact+self) ⇒ <code>boolean</code>
    * _static_
        * [.find(query)](#Contact.find) ⇒ <code>Promise.&lt;(Contact\|null)&gt;</code>
        * [.findAll([queryArg])](#Contact.findAll) ⇒ <code>Promise.&lt;Array.&lt;Contact&gt;&gt;</code>
        * [.tags()](#Contact.tags) ⇒ <code>Promise.&lt;Array.&lt;Tag&gt;&gt;</code>

<a name="Contact+say"></a>

### contact.say(something) ⇒ <code>Promise.&lt;(void\|Message)&gt;</code>
> Tips:
This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/wechaty/wechaty/wiki/Puppet#3-puppet-compatible-table)

**Kind**: instance method of [<code>Contact</code>](#Contact)  

| Param | Type | Description |
| --- | --- | --- |
| something | <code>string</code> \| [<code>Contact</code>](#Contact) \| <code>FileBox</code> \| <code>UrlLink</code> \| <code>MiniProgram</code> | send text, Contact, or file to contact. </br> You can use [FileBox](https://www.npmjs.com/package/file-box) to send file |

**Example**  
```js
const bot = new Wechaty()
await bot.start()
const contact = await bot.Contact.find({name: 'lijiarui'})  // change 'lijiarui' to any of your contact name in wechat

// 1. send text to contact

await contact.say('welcome to wechaty!')
const msg = await contact.say('welcome to wechaty!') // only supported by puppet-padplus

// 2. send media file to contact

import { FileBox }  from 'wechaty'
const fileBox1 = FileBox.fromUrl('https://wechaty.github.io/wechaty/images/bot-qr-code.png')
const fileBox2 = FileBox.fromFile('/tmp/text.txt')
await contact.say(fileBox1)
const msg1 = await contact.say(fileBox1) // only supported by puppet-padplus
await contact.say(fileBox2)
const msg2 = await contact.say(fileBox2) // only supported by puppet-padplus

// 3. send contact card to contact

const contactCard = bot.Contact.load('contactId')
const msg = await contact.say(contactCard) // only supported by puppet-padplus

// 4. send url link to contact

const urlLink = new UrlLink ({
  description : 'WeChat Bot SDK for Individual Account, Powered by TypeScript, Docker, and Love',
  thumbnailUrl: 'https://avatars0.githubusercontent.com/u/25162437?s=200&v=4',
  title       : 'Welcome to Wechaty',
  url         : 'https://github.com/wechaty/wechaty',
})
await contact.say(urlLink)
const msg = await contact.say(urlLink) // only supported by puppet-padplus

// 5. send mini program to contact

const miniProgram = new MiniProgram ({
  username           : 'gh_xxxxxxx',     //get from mp.weixin.qq.com
  appid              : '',               //optional, get from mp.weixin.qq.com
  title              : '',               //optional
  pagepath           : '',               //optional
  description        : '',               //optional
  thumbnailurl       : '',               //optional
})
await contact.say(miniProgram)
const msg = await contact.say(miniProgram) // only supported by puppet-padplus
```
<a name="Contact+name"></a>

### contact.name() ⇒ <code>string</code>
Get the name from a contact

**Kind**: instance method of [<code>Contact</code>](#Contact)  
**Example**  
```js
const name = contact.name()
```
<a name="Contact+alias"></a>

### contact.alias(newAlias) ⇒ <code>Promise.&lt;(null\|string\|void)&gt;</code>
GET / SET / DELETE the alias for a contact

Tests show it will failed if set alias too frequently(60 times in one minute).

**Kind**: instance method of [<code>Contact</code>](#Contact)  

| Param | Type |
| --- | --- |
| newAlias | <code>none</code> \| <code>string</code> \| <code>null</code> | 

**Example** *( GET the alias for a contact, return {(Promise&lt;string | null&gt;)})*  
```js
const alias = await contact.alias()
if (alias === null) {
  console.log('You have not yet set any alias for contact ' + contact.name())
} else {
  console.log('You have already set an alias for contact ' + contact.name() + ':' + alias)
}
```
**Example** *(SET the alias for a contact)*  
```js
try {
  await contact.alias('lijiarui')
  console.log(`change ${contact.name()}'s alias successfully!`)
} catch (e) {
  console.log(`failed to change ${contact.name()} alias!`)
}
```
**Example** *(DELETE the alias for a contact)*  
```js
try {
  const oldAlias = await contact.alias(null)
  console.log(`delete ${contact.name()}'s alias successfully!`)
  console.log('old alias is ${oldAlias}`)
} catch (e) {
  console.log(`failed to delete ${contact.name()}'s alias!`)
}
```
<a name="Contact+friend"></a>

### contact.friend() ⇒ <code>boolean</code> \| <code>null</code>
Check if contact is friend

> Tips:
This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/wechaty/wechaty/wiki/Puppet#3-puppet-compatible-table)

**Kind**: instance method of [<code>Contact</code>](#Contact)  
**Returns**: <code>boolean</code> \| <code>null</code> - <br>True for friend of the bot <br>
False for not friend of the bot, null for unknown.  
**Example**  
```js
const isFriend = contact.friend()
```
<a name="Contact+type"></a>

### contact.type() ⇒ <code>ContactType.Unknown</code> \| <code>ContactType.Personal</code> \| <code>ContactType.Official</code>
Return the type of the Contact
> Tips: ContactType is enum here.</br>

**Kind**: instance method of [<code>Contact</code>](#Contact)  
**Example**  
```js
const bot = new Wechaty()
await bot.start()
const isOfficial = contact.type() === bot.Contact.Type.Official
```
<a name="Contact+gender"></a>

### contact.gender() ⇒ <code>ContactGender.Unknown</code> \| <code>ContactGender.Male</code> \| <code>ContactGender.Female</code>
Contact gender
> Tips: ContactGender is enum here. </br>

**Kind**: instance method of [<code>Contact</code>](#Contact)  
**Example**  
```js
const gender = contact.gender() === bot.Contact.Gender.Male
```
<a name="Contact+province"></a>

### contact.province() ⇒ <code>string</code> \| <code>null</code>
Get the region 'province' from a contact

**Kind**: instance method of [<code>Contact</code>](#Contact)  
**Example**  
```js
const province = contact.province()
```
<a name="Contact+city"></a>

### contact.city() ⇒ <code>string</code> \| <code>null</code>
Get the region 'city' from a contact

**Kind**: instance method of [<code>Contact</code>](#Contact)  
**Example**  
```js
const city = contact.city()
```
<a name="Contact+avatar"></a>

### contact.avatar() ⇒ <code>Promise.&lt;FileBox&gt;</code>
Get avatar picture file stream

**Kind**: instance method of [<code>Contact</code>](#Contact)  
**Example**  
```js
// Save avatar to local file like `1-name.jpg`

const file = await contact.avatar()
const name = file.name
await file.toFile(name, true)
console.log(`Contact: ${contact.name()} with avatar file: ${name}`)
```
<a name="Contact+tags"></a>

### contact.tags() ⇒ <code>Promise.&lt;Array.&lt;Tag&gt;&gt;</code>
Get all tags of contact

**Kind**: instance method of [<code>Contact</code>](#Contact)  
**Example**  
```js
const tags = await contact.tags()
```
<a name="Contact+sync"></a>

### contact.sync() ⇒ <code>Promise.&lt;this&gt;</code>
Force reload data for Contact, Sync data from low-level API again.

**Kind**: instance method of [<code>Contact</code>](#Contact)  
**Example**  
```js
await contact.sync()
```
<a name="Contact+self"></a>

### contact.self() ⇒ <code>boolean</code>
Check if contact is self

**Kind**: instance method of [<code>Contact</code>](#Contact)  
**Returns**: <code>boolean</code> - True for contact is self, False for contact is others  
**Example**  
```js
const isSelf = contact.self()
```
<a name="Contact.find"></a>

### Contact.find(query) ⇒ <code>Promise.&lt;(Contact\|null)&gt;</code>
Try to find a contact by filter: {name: string | RegExp} / {alias: string | RegExp}

Find contact by name or alias, if the result more than one, return the first one.

**Kind**: static method of [<code>Contact</code>](#Contact)  
**Returns**: <code>Promise.&lt;(Contact\|null)&gt;</code> - If can find the contact, return Contact, or return null  

| Param | Type |
| --- | --- |
| query | [<code>ContactQueryFilter</code>](#ContactQueryFilter) | 

**Example**  
```js
const bot = new Wechaty()
await bot.start()
const contactFindByName = await bot.Contact.find({ name:"ruirui"} )
const contactFindByAlias = await bot.Contact.find({ alias:"lijiarui"} )
```
<a name="Contact.findAll"></a>

### Contact.findAll([queryArg]) ⇒ <code>Promise.&lt;Array.&lt;Contact&gt;&gt;</code>
Find contact by `name` or `alias`

If use Contact.findAll() get the contact list of the bot.

#### definition
- `name`   the name-string set by user-self, should be called name
- `alias`  the name-string set by bot for others, should be called alias

**Kind**: static method of [<code>Contact</code>](#Contact)  

| Param | Type |
| --- | --- |
| [queryArg] | [<code>ContactQueryFilter</code>](#ContactQueryFilter) | 

**Example**  
```js
const bot = new Wechaty()
await bot.start()
const contactList = await bot.Contact.findAll()                      // get the contact list of the bot
const contactList = await bot.Contact.findAll({ name: 'ruirui' })    // find all of the contacts whose name is 'ruirui'
const contactList = await bot.Contact.findAll({ alias: 'lijiarui' }) // find all of the contacts whose alias is 'lijiarui'
```
<a name="Contact.tags"></a>

### Contact.tags() ⇒ <code>Promise.&lt;Array.&lt;Tag&gt;&gt;</code>
Get tags for all contact

**Kind**: static method of [<code>Contact</code>](#Contact)  
**Example**  
```js
const tags = await wechaty.Contact.tags()
```
<a name="ContactSelf"></a>

## ContactSelf
Bot itself will be encapsulated as a ContactSelf.

> Tips: this class is extends Contact

**Kind**: global class  

* [ContactSelf](#ContactSelf)
    * [.avatar([file])](#ContactSelf+avatar) ⇒ <code>Promise.&lt;(void\|FileBox)&gt;</code>
    * [.qrcode()](#ContactSelf+qrcode) ⇒ <code>Promise.&lt;string&gt;</code>
    * [.signature(signature)](#ContactSelf+signature)

<a name="ContactSelf+avatar"></a>

### contactSelf.avatar([file]) ⇒ <code>Promise.&lt;(void\|FileBox)&gt;</code>
GET / SET bot avatar

**Kind**: instance method of [<code>ContactSelf</code>](#ContactSelf)  

| Param | Type |
| --- | --- |
| [file] | <code>FileBox</code> | 

**Example** *( GET the avatar for bot, return {Promise&lt;FileBox&gt;})*  
```js
// Save avatar to local file like `1-name.jpg`

bot.on('login', (user: ContactSelf) => {
  console.log(`user ${user} login`)
  const file = await user.avatar()
  const name = file.name
  await file.toFile(name, true)
  console.log(`Save bot avatar: ${contact.name()} with avatar file: ${name}`)
})
```
**Example** *(SET the avatar for a bot)*  
```js
import { FileBox }  from 'wechaty'
bot.on('login', (user: ContactSelf) => {
  console.log(`user ${user} login`)
  const fileBox = FileBox.fromUrl('https://wechaty.github.io/wechaty/images/bot-qr-code.png')
  await user.avatar(fileBox)
  console.log(`Change bot avatar successfully!`)
})
```
<a name="ContactSelf+qrcode"></a>

### contactSelf.qrcode() ⇒ <code>Promise.&lt;string&gt;</code>
Get bot qrcode

**Kind**: instance method of [<code>ContactSelf</code>](#ContactSelf)  
**Example**  
```js
import { generate } from 'qrcode-terminal'
bot.on('login', (user: ContactSelf) => {
  console.log(`user ${user} login`)
  const qrcode = await user.qrcode()
  console.log(`Following is the bot qrcode!`)
  generate(qrcode, { small: true })
})
```
<a name="ContactSelf+signature"></a>

### contactSelf.signature(signature)
Change bot signature

**Kind**: instance method of [<code>ContactSelf</code>](#ContactSelf)  

| Param | Description |
| --- | --- |
| signature | The new signature that the bot will change to |

**Example**  
```js
bot.on('login', async user => {
  console.log(`user ${user} login`)
  try {
    await user.signature(`Signature changed by wechaty on ${new Date()}`)
  } catch (e) {
    console.error('change signature failed', e)
  }
})
```
<a name="Friendship"></a>

## Friendship
Send, receive friend request, and friend confirmation events.

1. send request
2. receive request(in friend event)
3. confirmation friendship(friend event)

[Examples/Friend-Bot](https://github.com/wechaty/wechaty/blob/1523c5e02be46ebe2cc172a744b2fbe53351540e/examples/friend-bot.ts)

**Kind**: global class  

* [Friendship](#Friendship)
    * _instance_
        * [.accept()](#Friendship+accept) ⇒ <code>Promise.&lt;void&gt;</code>
        * [.hello()](#Friendship+hello) ⇒ <code>string</code>
        * [.contact()](#Friendship+contact) ⇒ [<code>Contact</code>](#Contact)
        * [.type()](#Friendship+type) ⇒ <code>FriendshipType</code>
        * [.toJSON()](#Friendship+toJSON) ⇒ <code>FriendshipPayload</code>
    * _static_
        * [.search(condition)](#Friendship.search) ⇒ [<code>Promise.&lt;Contact&gt;</code>](#Contact)
        * [.add(contact, hello)](#Friendship.add) ⇒ <code>Promise.&lt;void&gt;</code>
        * [.fromJSON()](#Friendship.fromJSON)

<a name="Friendship+accept"></a>

### friendship.accept() ⇒ <code>Promise.&lt;void&gt;</code>
Accept Friend Request

**Kind**: instance method of [<code>Friendship</code>](#Friendship)  
**Example**  
```js
const bot = new Wechaty()
bot.on('friendship', async friendship => {
  try {
    console.log(`received friend event.`)
    switch (friendship.type()) {

    // 1. New Friend Request

    case Friendship.Type.Receive:
      await friendship.accept()
      break

    // 2. Friend Ship Confirmed

    case Friendship.Type.Confirm:
      console.log(`friend ship confirmed`)
      break
    }
  } catch (e) {
    console.error(e)
  }
}
.start()
```
<a name="Friendship+hello"></a>

### friendship.hello() ⇒ <code>string</code>
Get verify message from

**Kind**: instance method of [<code>Friendship</code>](#Friendship)  
**Example** *(If request content is &#x60;ding&#x60;, then accept the friendship)*  
```js
const bot = new Wechaty()
bot.on('friendship', async friendship => {
  try {
    console.log(`received friend event from ${friendship.contact().name()}`)
    if (friendship.type() === Friendship.Type.Receive && friendship.hello() === 'ding') {
      await friendship.accept()
    }
  } catch (e) {
    console.error(e)
  }
}
.start()
```
<a name="Friendship+contact"></a>

### friendship.contact() ⇒ [<code>Contact</code>](#Contact)
Get the contact from friendship

**Kind**: instance method of [<code>Friendship</code>](#Friendship)  
**Example**  
```js
const bot = new Wechaty()
bot.on('friendship', async friendship => {
  const contact = friendship.contact()
  const name = contact.name()
  console.log(`received friend event from ${name}`)
}
.start()
```
<a name="Friendship+type"></a>

### friendship.type() ⇒ <code>FriendshipType</code>
Return the Friendship Type
> Tips: FriendshipType is enum here. </br>
- FriendshipType.Unknown  </br>
- FriendshipType.Confirm  </br>
- FriendshipType.Receive  </br>
- FriendshipType.Verify   </br>

**Kind**: instance method of [<code>Friendship</code>](#Friendship)  
**Example** *(If request content is &#x60;ding&#x60;, then accept the friendship)*  
```js
const bot = new Wechaty()
bot.on('friendship', async friendship => {
  try {
    if (friendship.type() === Friendship.Type.Receive && friendship.hello() === 'ding') {
      await friendship.accept()
    }
  } catch (e) {
    console.error(e)
  }
}
.start()
```
<a name="Friendship+toJSON"></a>

### friendship.toJSON() ⇒ <code>FriendshipPayload</code>
get friendShipPayload Json

**Kind**: instance method of [<code>Friendship</code>](#Friendship)  
**Example**  
```js
const bot = new Wechaty()
bot.on('friendship', async friendship => {
  try {
    // JSON.stringify(friendship) as well.
    const payload = await friendship.toJSON()
  } catch (e) {
    console.error(e)
  }
}
.start()
```
<a name="Friendship.search"></a>

### Friendship.search(condition) ⇒ [<code>Promise.&lt;Contact&gt;</code>](#Contact)
Search a Friend by phone or weixin.

The best practice is to search friend request once per minute.
Remeber not to do this too frequently, or your account may be blocked.

**Kind**: static method of [<code>Friendship</code>](#Friendship)  

| Param | Type | Description |
| --- | --- | --- |
| condition | <code>FriendshipSearchCondition</code> | Search friend by phone or weixin. |

**Example**  
```js
const friend_phone = await bot.Friendship.search({phone: '13112341234'})
const friend_weixin = await bot.Friendship.search({weixin: 'weixin_account'})

console.log(`This is the new friend info searched by phone : ${friend_phone}`)
await bot.Friendship.add(friend_phone, 'hello')
```
<a name="Friendship.add"></a>

### Friendship.add(contact, hello) ⇒ <code>Promise.&lt;void&gt;</code>
Send a Friend Request to a `contact` with message `hello`.

The best practice is to send friend request once per minute.
Remeber not to do this too frequently, or your account may be blocked.

**Kind**: static method of [<code>Friendship</code>](#Friendship)  

| Param | Type | Description |
| --- | --- | --- |
| contact | [<code>Contact</code>](#Contact) | Send friend request to contact |
| hello | <code>string</code> | The friend request content |

**Example**  
```js
const memberList = await room.memberList()
for (let i = 0; i < memberList.length; i++) {
  await bot.Friendship.add(member, 'Nice to meet you! I am wechaty bot!')
}
```
<a name="Friendship.fromJSON"></a>

### Friendship.fromJSON()
create friendShip by friendshipJson

**Kind**: static method of [<code>Friendship</code>](#Friendship)  
**Example**  
```js
const bot = new Wechaty()
bot.start()

const payload = '{...}'  // your saved JSON payload
const friendship = bot.FriendShip.fromJSON(friendshipFromDisk)
await friendship.accept()
```
<a name="Message"></a>

## Message
All wechat messages will be encapsulated as a Message.

[Examples/Ding-Dong-Bot](https://github.com/wechaty/wechaty/blob/1523c5e02be46ebe2cc172a744b2fbe53351540e/examples/ding-dong-bot.ts)

**Kind**: global class  

* [Message](#Message)
    * _instance_
        * [.from()](#Message+from) ⇒ [<code>Contact</code>](#Contact)
        * [.to()](#Message+to) ⇒ [<code>Contact</code>](#Contact) \| <code>null</code>
        * [.room()](#Message+room) ⇒ [<code>Room</code>](#Room) \| <code>null</code>
        * [.text()](#Message+text) ⇒ <code>string</code>
        * [.toRecalled()](#Message+toRecalled)
        * [.say(textOrContactOrFile, [mention])](#Message+say) ⇒ <code>Promise.&lt;(void\|Message)&gt;</code>
        * [.recall()](#Message+recall) ⇒ <code>Promise.&lt;boolean&gt;</code>
        * [.type()](#Message+type) ⇒ <code>MessageType</code>
        * [.self()](#Message+self) ⇒ <code>boolean</code>
        * [.mentionList()](#Message+mentionList) ⇒ <code>Promise.&lt;Array.&lt;Contact&gt;&gt;</code>
        * [.mentionSelf()](#Message+mentionSelf) ⇒ <code>Promise.&lt;boolean&gt;</code>
        * [.forward(to)](#Message+forward) ⇒ <code>Promise.&lt;void&gt;</code>
        * [.date()](#Message+date)
        * [.age()](#Message+age) ⇒ <code>number</code>
        * [.toFileBox()](#Message+toFileBox) ⇒ <code>Promise.&lt;FileBox&gt;</code>
        * [.toImage()](#Message+toImage) ⇒ <code>Image</code>
        * [.toContact()](#Message+toContact) ⇒ [<code>Promise.&lt;Contact&gt;</code>](#Contact)
    * _static_
        * [.find()](#Message.find)
        * [.findAll()](#Message.findAll)

<a name="Message+from"></a>

### message.from() ⇒ [<code>Contact</code>](#Contact)
Get the sender from a message.

**Kind**: instance method of [<code>Message</code>](#Message)  
**Example**  
```js
const bot = new Wechaty()
bot
.on('message', async m => {
  const contact = msg.from()
  const text = msg.text()
  const room = msg.room()
  if (room) {
    const topic = await room.topic()
    console.log(`Room: ${topic} Contact: ${contact.name()} Text: ${text}`)
  } else {
    console.log(`Contact: ${contact.name()} Text: ${text}`)
  }
})
.start()
```
<a name="Message+to"></a>

### message.to() ⇒ [<code>Contact</code>](#Contact) \| <code>null</code>
Get the destination of the message
Message.to() will return null if a message is in a room, use Message.room() to get the room.

**Kind**: instance method of [<code>Message</code>](#Message)  
<a name="Message+room"></a>

### message.room() ⇒ [<code>Room</code>](#Room) \| <code>null</code>
Get the room from the message.
If the message is not in a room, then will return `null`

**Kind**: instance method of [<code>Message</code>](#Message)  
**Example**  
```js
const bot = new Wechaty()
bot
.on('message', async m => {
  const contact = msg.from()
  const text = msg.text()
  const room = msg.room()
  if (room) {
    const topic = await room.topic()
    console.log(`Room: ${topic} Contact: ${contact.name()} Text: ${text}`)
  } else {
    console.log(`Contact: ${contact.name()} Text: ${text}`)
  }
})
.start()
```
<a name="Message+text"></a>

### message.text() ⇒ <code>string</code>
Get the text content of the message

**Kind**: instance method of [<code>Message</code>](#Message)  
**Example**  
```js
const bot = new Wechaty()
bot
.on('message', async m => {
  const contact = msg.from()
  const text = msg.text()
  const room = msg.room()
  if (room) {
    const topic = await room.topic()
    console.log(`Room: ${topic} Contact: ${contact.name()} Text: ${text}`)
  } else {
    console.log(`Contact: ${contact.name()} Text: ${text}`)
  }
})
.start()
```
<a name="Message+toRecalled"></a>

### message.toRecalled()
Get the recalled message

**Kind**: instance method of [<code>Message</code>](#Message)  
**Example**  
```js
const bot = new Wechaty()
bot
.on('message', async m => {
  if (m.type() === MessageType.Recalled) {
    const recalledMessage = await m.toRecalled()
    console.log(`Message: ${recalledMessage} has been recalled.`)
  }
})
.start()
```
<a name="Message+say"></a>

### message.say(textOrContactOrFile, [mention]) ⇒ <code>Promise.&lt;(void\|Message)&gt;</code>
Reply a Text or Media File message to the sender.
> Tips:
This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/wechaty/wechaty/wiki/Puppet#3-puppet-compatible-table)

**Kind**: instance method of [<code>Message</code>](#Message)  
**See**: [Examples/ding-dong-bot](https://github.com/wechaty/wechaty/blob/1523c5e02be46ebe2cc172a744b2fbe53351540e/examples/ding-dong-bot.ts)  

| Param | Type | Description |
| --- | --- | --- |
| textOrContactOrFile | <code>string</code> \| [<code>Contact</code>](#Contact) \| <code>FileBox</code> \| <code>UrlLink</code> \| <code>MiniProgram</code> | send text, Contact, or file to bot. </br> You can use [FileBox](https://www.npmjs.com/package/file-box) to send file |
| [mention] | [<code>Contact</code>](#Contact) \| [<code>Array.&lt;Contact&gt;</code>](#Contact) | If this is a room message, when you set mention param, you can `@` Contact in the room. |

**Example**  
```js
import { FileBox }  from 'wechaty'
const bot = new Wechaty()
bot
.on('message', async m => {

// 1. send Image

  if (/^ding$/i.test(m.text())) {
    const fileBox = FileBox.fromUrl('https://wechaty.github.io/wechaty/images/bot-qr-code.png')
    await msg.say(fileBox)
    const message = await msg.say(fileBox) // only supported by puppet-padplus
  }

// 2. send Text

  if (/^dong$/i.test(m.text())) {
    await msg.say('ding')
    const message = await msg.say('ding') // only supported by puppet-padplus
  }

// 3. send Contact

  if (/^lijiarui$/i.test(m.text())) {
    const contactCard = await bot.Contact.find({name: 'lijiarui'})
    if (!contactCard) {
      console.log('not found')
      return
    }
    await msg.say(contactCard)
    const message = await msg.say(contactCard) // only supported by puppet-padplus
  }

// 4. send Link

  if (/^link$/i.test(m.text())) {
    const linkPayload = new UrlLink ({
      description : 'WeChat Bot SDK for Individual Account, Powered by TypeScript, Docker, and Love',
      thumbnailUrl: 'https://avatars0.githubusercontent.com/u/25162437?s=200&v=4',
      title       : 'Welcome to Wechaty',
      url         : 'https://github.com/wechaty/wechaty',
    })
    await msg.say(linkPayload)
    const message = await msg.say(linkPayload) // only supported by puppet-padplus
  }

// 5. send MiniProgram

  if (/^link$/i.test(m.text())) {
    const miniProgramPayload = new MiniProgram ({
      username           : 'gh_xxxxxxx',     //get from mp.weixin.qq.com
      appid              : '',               //optional, get from mp.weixin.qq.com
      title              : '',               //optional
      pagepath           : '',               //optional
      description        : '',               //optional
      thumbnailurl       : '',               //optional
    })
    await msg.say(miniProgramPayload)
    const message = await msg.say(miniProgramPayload) // only supported by puppet-padplus
  }

})
.start()
```
<a name="Message+recall"></a>

### message.recall() ⇒ <code>Promise.&lt;boolean&gt;</code>
Recall a message.
> Tips:

**Kind**: instance method of [<code>Message</code>](#Message)  
**Example**  
```js
const bot = new Wechaty()
bot
.on('message', async m => {
  const recallMessage = await msg.say('123')
  if (recallMessage) {
    const isSuccess = await recallMessage.recall()
  }
})
```
<a name="Message+type"></a>

### message.type() ⇒ <code>MessageType</code>
Get the type from the message.
> Tips: MessageType is Enum here. </br>
- MessageType.Unknown     </br>
- MessageType.Attachment  </br>
- MessageType.Audio       </br>
- MessageType.Contact     </br>
- MessageType.Emoticon    </br>
- MessageType.Image       </br>
- MessageType.Text        </br>
- MessageType.Video       </br>
- MessageType.Url         </br>

**Kind**: instance method of [<code>Message</code>](#Message)  
**Example**  
```js
const bot = new Wechaty()
if (message.type() === bot.Message.Type.Text) {
  console.log('This is a text message')
}
```
<a name="Message+self"></a>

### message.self() ⇒ <code>boolean</code>
Check if a message is sent by self.

**Kind**: instance method of [<code>Message</code>](#Message)  
**Returns**: <code>boolean</code> - - Return `true` for send from self, `false` for send from others.  
**Example**  
```js
if (message.self()) {
 console.log('this message is sent by myself!')
}
```
<a name="Message+mentionList"></a>

### message.mentionList() ⇒ <code>Promise.&lt;Array.&lt;Contact&gt;&gt;</code>
Get message mentioned contactList.

Message event table as follows

|                                                                            | Web  |  Mac PC Client | iOS Mobile |  android Mobile |
| :---                                                                       | :--: |     :----:     |   :---:    |     :---:       |
| [You were mentioned] tip ([有人@我]的提示)                                   |  ✘   |        √       |     √      |       √         |
| Identify magic code (8197) by copy & paste in mobile                       |  ✘   |        √       |     √      |       ✘         |
| Identify magic code (8197) by programming                                  |  ✘   |        ✘       |     ✘      |       ✘         |
| Identify two contacts with the same roomAlias by [You were  mentioned] tip |  ✘   |        ✘       |     √      |       √         |

**Kind**: instance method of [<code>Message</code>](#Message)  
**Returns**: <code>Promise.&lt;Array.&lt;Contact&gt;&gt;</code> - - Return message mentioned contactList  
**Example**  
```js
const contactList = await message.mentionList()
console.log(contactList)
```
<a name="Message+mentionSelf"></a>

### message.mentionSelf() ⇒ <code>Promise.&lt;boolean&gt;</code>
Check if a message is mention self.

**Kind**: instance method of [<code>Message</code>](#Message)  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - - Return `true` for mention me.  
**Example**  
```js
if (await message.mentionSelf()) {
 console.log('this message were mentioned me! [You were mentioned] tip ([有人@我]的提示)')
}
```
<a name="Message+forward"></a>

### message.forward(to) ⇒ <code>Promise.&lt;void&gt;</code>
Forward the received message.

**Kind**: instance method of [<code>Message</code>](#Message)  

| Param | Type | Description |
| --- | --- | --- |
| to | <code>Sayable</code> \| <code>Array.&lt;Sayable&gt;</code> | Room or Contact The recipient of the message, the room, or the contact |

**Example**  
```js
const bot = new Wechaty()
bot
.on('message', async m => {
  const room = await bot.Room.find({topic: 'wechaty'})
  if (room) {
    await m.forward(room)
    console.log('forward this message to wechaty room!')
  }
})
.start()
```
<a name="Message+date"></a>

### message.date()
Message sent date

**Kind**: instance method of [<code>Message</code>](#Message)  
<a name="Message+age"></a>

### message.age() ⇒ <code>number</code>
Returns the message age in seconds. <br>

For example, the message is sent at time `8:43:01`,
and when we received it in Wechaty, the time is `8:43:15`,
then the age() will return `8:43:15 - 8:43:01 = 14 (seconds)`

**Kind**: instance method of [<code>Message</code>](#Message)  
**Returns**: <code>number</code> - message age in seconds.  
<a name="Message+toFileBox"></a>

### message.toFileBox() ⇒ <code>Promise.&lt;FileBox&gt;</code>
Extract the Media File from the Message, and put it into the FileBox.
> Tips:
This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/wechaty/wechaty/wiki/Puppet#3-puppet-compatible-table)

**Kind**: instance method of [<code>Message</code>](#Message)  
**Example** *(Save media file from a message)*  
```js
const fileBox = await message.toFileBox()
const fileName = fileBox.name
fileBox.toFile(fileName)
```
<a name="Message+toImage"></a>

### message.toImage() ⇒ <code>Image</code>
Extract the Image File from the Message, so that we can use different image sizes.
> Tips:
This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/wechaty/wechaty/wiki/Puppet#3-puppet-compatible-table)

**Kind**: instance method of [<code>Message</code>](#Message)  
**Example** *(Save image file from a message)*  
```js
const image = message.toImage()
const fileBox = await image.artwork()
const fileName = fileBox.name
fileBox.toFile(fileName)
```
<a name="Message+toContact"></a>

### message.toContact() ⇒ [<code>Promise.&lt;Contact&gt;</code>](#Contact)
Get Share Card of the Message
Extract the Contact Card from the Message, and encapsulate it into Contact class
> Tips:
This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/wechaty/wechaty/wiki/Puppet#3-puppet-compatible-table)

**Kind**: instance method of [<code>Message</code>](#Message)  
<a name="Message.find"></a>

### Message.find()
Find message in cache

**Kind**: static method of [<code>Message</code>](#Message)  
<a name="Message.findAll"></a>

### Message.findAll()
Find messages in cache

**Kind**: static method of [<code>Message</code>](#Message)  
<a name="RoomInvitation"></a>

## RoomInvitation
accept room invitation

**Kind**: global class  

* [RoomInvitation](#RoomInvitation)
    * _instance_
        * [.accept()](#RoomInvitation+accept) ⇒ <code>Promise.&lt;void&gt;</code>
        * [.inviter()](#RoomInvitation+inviter) ⇒ [<code>Contact</code>](#Contact)
        * [.topic()](#RoomInvitation+topic) ⇒ [<code>Contact</code>](#Contact)
        * [.date()](#RoomInvitation+date) ⇒ <code>Promise.&lt;Date&gt;</code>
        * [.age()](#RoomInvitation+age) ⇒ <code>number</code>
        * [.toJSON()](#RoomInvitation+toJSON) ⇒ <code>string</code>
    * _static_
        * [.fromJSON()](#RoomInvitation.fromJSON) ⇒ [<code>RoomInvitation</code>](#RoomInvitation)

<a name="RoomInvitation+accept"></a>

### roomInvitation.accept() ⇒ <code>Promise.&lt;void&gt;</code>
Accept Room Invitation

**Kind**: instance method of [<code>RoomInvitation</code>](#RoomInvitation)  
**Example**  
```js
const bot = new Wechaty()
bot.on('room-invite', async roomInvitation => {
  try {
    console.log(`received room-invite event.`)
    await roomInvitation.accept()
  } catch (e) {
    console.error(e)
  }
}
.start()
```
<a name="RoomInvitation+inviter"></a>

### roomInvitation.inviter() ⇒ [<code>Contact</code>](#Contact)
Get the inviter from room invitation

**Kind**: instance method of [<code>RoomInvitation</code>](#RoomInvitation)  
**Example**  
```js
const bot = new Wechaty()
bot.on('room-invite', async roomInvitation => {
  const inviter = await roomInvitation.inviter()
  const name = inviter.name()
  console.log(`received room invitation event from ${name}`)
}
.start()
```
<a name="RoomInvitation+topic"></a>

### roomInvitation.topic() ⇒ [<code>Contact</code>](#Contact)
Get the room topic from room invitation

**Kind**: instance method of [<code>RoomInvitation</code>](#RoomInvitation)  
**Example**  
```js
const bot = new Wechaty()
bot.on('room-invite', async roomInvitation => {
  const topic = await roomInvitation.topic()
  console.log(`received room invitation event from room ${topic}`)
}
.start()
```
<a name="RoomInvitation+date"></a>

### roomInvitation.date() ⇒ <code>Promise.&lt;Date&gt;</code>
Get the invitation time

**Kind**: instance method of [<code>RoomInvitation</code>](#RoomInvitation)  
<a name="RoomInvitation+age"></a>

### roomInvitation.age() ⇒ <code>number</code>
Returns the roopm invitation age in seconds. <br>

For example, the invitation is sent at time `8:43:01`,
and when we received it in Wechaty, the time is `8:43:15`,
then the age() will return `8:43:15 - 8:43:01 = 14 (seconds)`

**Kind**: instance method of [<code>RoomInvitation</code>](#RoomInvitation)  
<a name="RoomInvitation+toJSON"></a>

### roomInvitation.toJSON() ⇒ <code>string</code>
Get the room invitation info when listened on room-invite event

**Kind**: instance method of [<code>RoomInvitation</code>](#RoomInvitation)  
**Example**  
```js
const bot = new Wechaty()
bot.on('room-invite', async roomInvitation => {
 const roomInvitation = bot.RoomInvitation.load(roomInvitation.id)
 const jsonData = await roomInvitation.toJSON(roomInvitation.id)
 // save the json data to disk, and we can use it by RoomInvitation.fromJSON()
}
.start()
```
<a name="RoomInvitation.fromJSON"></a>

### RoomInvitation.fromJSON() ⇒ [<code>RoomInvitation</code>](#RoomInvitation)
Load the room invitation info from disk

**Kind**: static method of [<code>RoomInvitation</code>](#RoomInvitation)  
**Example**  
```js
const bot = new Wechaty()
const dataFromDisk // get the room invitation info data from disk
const roomInvitation = await bot.RoomInvitation.fromJSON(dataFromDisk)
await roomInvitation.accept()
```
<a name="cuid_1"></a>

## cuid\_1
Wechaty Chatbot SDK - https://github.com/wechaty/wechaty

**Kind**: global constant  
**Copyright**: 2016 Huan LI (李卓桓) <https://github.com/huan>, and
                  Wechaty Contributors <https://github.com/wechaty>.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.  
<a name="clone_class_1"></a>

## clone\_class\_1
Wechaty Chatbot SDK - https://github.com/wechaty/wechaty

**Kind**: global constant  
**Copyright**: 2016 Huan LI (李卓桓) <https://github.com/huan>, and
                  Wechaty Contributors <https://github.com/wechaty>.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.  
<a name="clone_class_1"></a>

## clone\_class\_1
Wechaty Chatbot SDK - https://github.com/wechaty/wechaty

**Kind**: global constant  
**Copyright**: 2016 Huan LI (李卓桓) <https://github.com/huan>, and
                  Wechaty Contributors <https://github.com/wechaty>.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.  
<a name="wechaty_puppet_1"></a>

## wechaty\_puppet\_1
Wechaty Chatbot SDK - https://github.com/wechaty/wechaty

**Kind**: global constant  
**Copyright**: 2016 Huan LI (李卓桓) <https://github.com/huan>, and
                  Wechaty Contributors <https://github.com/wechaty>.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.  
<a name="events_1"></a>

## events\_1
Wechaty Chatbot SDK - https://github.com/wechaty/wechaty

**Kind**: global constant  
**Copyright**: 2016 Huan LI (李卓桓) <https://github.com/huan>, and
                  Wechaty Contributors <https://github.com/wechaty>.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.  
<a name="events_1"></a>

## events\_1
Wechaty Chatbot SDK - https://github.com/wechaty/wechaty

**Kind**: global constant  
**Copyright**: 2016 Huan LI (李卓桓) <https://github.com/huan>, and
                  Wechaty Contributors <https://github.com/wechaty>.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.  
<a name="clone_class_1"></a>

## clone\_class\_1
Wechaty Chatbot SDK - https://github.com/wechaty/wechaty

**Kind**: global constant  
**Copyright**: 2016 Huan LI (李卓桓) <https://github.com/huan>, and
                  Wechaty Contributors <https://github.com/wechaty>.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.  
<a name="guardWechatify"></a>

## guardWechatify()
Huan(202008): we will bind the wechaty puppet with user modules (Contact, Room, etc) together inside the start() method

**Kind**: global function  
<a name="PuppetModuleName"></a>

## PuppetModuleName
The term [Puppet](https://github.com/wechaty/wechaty/wiki/Puppet) in Wechaty is an Abstract Class for implementing protocol plugins.
The plugins are the component that helps Wechaty to control the WeChat(that's the reason we call it puppet).
The plugins are named XXXPuppet, for example:
- [PuppetPuppeteer](https://github.com/wechaty/wechaty-puppet-puppeteer):
- [PuppetPadchat](https://github.com/wechaty/wechaty-puppet-padchat)

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| PUPPET_DEFAULT | <code>string</code> | The default puppet. |
| wechaty-puppet-wechat4u | <code>string</code> | The default puppet, using the [wechat4u](https://github.com/nodeWechat/wechat4u) to control the [WeChat Web API](https://wx.qq.com/) via a chrome browser. |
| wechaty-puppet-padchat | <code>string</code> | - Using the WebSocket protocol to connect with a Protocol Server for controlling the iPad WeChat program. |
| wechaty-puppet-puppeteer | <code>string</code> | - Using the [google puppeteer](https://github.com/GoogleChrome/puppeteer) to control the [WeChat Web API](https://wx.qq.com/) via a chrome browser. |
| wechaty-puppet-mock | <code>string</code> | - Using the mock data to mock wechat operation, just for test. |

<a name="WechatyOptions"></a>

## WechatyOptions
The option parameter to create a wechaty instance

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | Wechaty Name. </br>          When you set this: </br>          `new Wechaty({name: 'wechaty-name'}) ` </br>          it will generate a file called `wechaty-name.memory-card.json`. </br>          This file stores the login information for bot. </br>          If the file is valid, the bot can auto login so you don't need to scan the qrCode to login again. </br>          Also, you can set the environment variable for `WECHATY_NAME` to set this value when you start. </br>          eg:  `WECHATY_NAME="your-cute-bot-name" node bot.js` |
| puppet | [<code>PuppetModuleName</code>](#PuppetModuleName) \| <code>Puppet</code> | Puppet name or instance |
| puppetOptions | <code>Partial.&lt;PuppetOptions&gt;</code> | Puppet TOKEN |
| ioToken | <code>string</code> | Io TOKEN |

<a name="RoomQueryFilter"></a>

## RoomQueryFilter
The filter to find the room:  {topic: string | RegExp}

**Kind**: global typedef  
**Properties**

| Name | Type |
| --- | --- |
| topic | <code>string</code> | 

<a name="RoomEventName"></a>

## RoomEventName
Room Class Event Type

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| join | <code>string</code> | Emit when anyone join any room. |
| topic | <code>string</code> | Get topic event, emitted when someone change room topic. |
| leave | <code>string</code> | Emit when anyone leave the room.<br>                               If someone leaves the room by themselves, WeChat will not notice other people in the room, so the bot will never get the "leave" event. |

<a name="RoomEventFunction"></a>

## RoomEventFunction
Room Class Event Function

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| room-join | <code>function</code> | (this: Room, inviteeList: Contact[] , inviter: Contact)  => void |
| room-topic | <code>function</code> | (this: Room, topic: string, oldTopic: string, changer: Contact) => void |
| room-leave | <code>function</code> | (this: Room, leaver: Contact) => void |

<a name="RoomMemberQueryFilter"></a>

## RoomMemberQueryFilter
The way to search member by Room.member()

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | Find the contact by WeChat name in a room, equal to `Contact.name()`. |
| roomAlias | <code>string</code> | Find the contact by alias set by the bot for others in a room. |
| contactAlias | <code>string</code> | Find the contact by alias set by the contact out of a room, equal to `Contact.alias()`. [More Detail](https://github.com/wechaty/wechaty/issues/365) |

<a name="ContactQueryFilter"></a>

## ContactQueryFilter
The way to search Contact

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | The name-string set by user-self, should be called name |
| alias | <code>string</code> | The name-string set by bot for others, should be called alias [More Detail](https://github.com/wechaty/wechaty/issues/365) |

<script>
  ((window.gitter = {}).chat = {}).options = {
    room: 'chatie/wechaty'
  };
</script>
<script src="https://sidecar.gitter.im/dist/sidecar.v1.js" async defer></script>
